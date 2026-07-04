import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:zego_express_engine/zego_express_engine.dart';

/// Connection state of the voice room, decoupled from the SDK's own
/// `ZegoRoomState` enum to avoid a name clash and keep the UI layer
/// independent of the SDK.
enum VoiceConnectionState {
  disconnected,
  connecting,
  connected,
  failed,
}

typedef VoiceStateChangedCallback = void Function(VoiceConnectionState state);
typedef VoiceUsersChangedCallback = void Function(List<String> userIds);
typedef SpeakingLevelsCallback = void Function(Map<String, double> levelsByUserId);
typedef TokenWillExpireCallback = void Function(String roomId);

/// Real ZEGOCLOUD voice service built on zego_express_engine.
///
/// Responsibilities:
///  - engine lifecycle (token-based auth; the app ships no appSign)
///  - room login/logout with the Token04 issued by the backend
///  - publishing the local microphone stream (only while on a seat)
///  - playing every remote audio stream in the room (without this,
///    nobody can be heard)
///  - mute/unmute, speaker routing, sound-level reporting
///  - token renewal via [onTokenWillExpire]
class ZegocloudService {
  static final ZegocloudService _instance = ZegocloudService._internal();
  factory ZegocloudService() => _instance;
  ZegocloudService._internal();

  bool _isInitialized = false;
  bool _isInRoom = false;
  bool _isPublishing = false;
  bool _isMicMuted = false;
  String? _currentRoomId;
  String? _currentUserId;

  /// streamId -> userId of remote streams we are currently playing.
  final Map<String, String> _playingStreams = {};

  VoiceConnectionState _state = VoiceConnectionState.disconnected;

  VoiceStateChangedCallback? onStateChanged;
  VoiceUsersChangedCallback? onUsersJoined;
  VoiceUsersChangedCallback? onUsersLeft;
  SpeakingLevelsCallback? onSpeakingLevels;
  TokenWillExpireCallback? onTokenWillExpire;

  VoiceConnectionState get state => _state;
  bool get isInitialized => _isInitialized;
  bool get isInRoom => _isInRoom;
  bool get isPublishing => _isPublishing;
  bool get isMicMuted => _isMicMuted;
  String? get currentRoomId => _currentRoomId;

  /// Create the Express engine in token-auth mode (no appSign in the app).
  Future<void> initialize({required int appId}) async {
    if (_isInitialized) return;
    if (appId == 0) {
      throw StateError(
        'ZEGO_APP_ID is not configured. '
        'Build with --dart-define=ZEGO_APP_ID=<your app id>.',
      );
    }

    await ZegoExpressEngine.createEngineWithProfile(
      ZegoEngineProfile(appId, ZegoScenario.HighQualityChatroom),
    );

    _registerEventHandlers();

    // Voice-chat friendly audio processing.
    await ZegoExpressEngine.instance.enableAEC(true);
    await ZegoExpressEngine.instance.enableANS(true);
    await ZegoExpressEngine.instance.enableAGC(true);
    await ZegoExpressEngine.instance.setAudioRouteToSpeaker(true);

    _isInitialized = true;
    debugPrint('[Zego] engine initialized (appId=$appId)');
  }

  /// Log in to a voice room as a listener. Call [startPublishing] once the
  /// user takes a seat.
  Future<void> joinRoom({
    required String roomId,
    required String userId,
    required String userName,
    required String token,
  }) async {
    if (!_isInitialized) {
      throw StateError('ZegocloudService.initialize() must be called first');
    }
    if (_isInRoom) {
      if (_currentRoomId == roomId) return;
      await leaveRoom();
    }

    _setState(VoiceConnectionState.connecting);
    _currentRoomId = roomId;
    _currentUserId = userId;

    final config = ZegoRoomConfig(0, true, token);
    final result = await ZegoExpressEngine.instance.loginRoom(
      roomId,
      ZegoUser(userId, userName),
      config: config,
    );

    if (result.errorCode != 0) {
      _setState(VoiceConnectionState.failed);
      _currentRoomId = null;
      _currentUserId = null;
      throw StateError('ZEGO loginRoom failed: ${result.errorCode}');
    }

    _isInRoom = true;
    _setState(VoiceConnectionState.connected);

    // Report sound levels ~3x/sec for speaking indicators.
    await ZegoExpressEngine.instance.startSoundLevelMonitor(
      config: ZegoSoundLevelConfig(300, false),
    );

    debugPrint('[Zego] joined room=$roomId user=$userId');
  }

  /// Leave the room and stop all audio.
  Future<void> leaveRoom() async {
    if (!_isInitialized) return;
    final roomId = _currentRoomId;

    try {
      if (_isPublishing) {
        await ZegoExpressEngine.instance.stopPublishingStream();
      }
      for (final streamId in _playingStreams.keys) {
        await ZegoExpressEngine.instance.stopPlayingStream(streamId);
      }
      await ZegoExpressEngine.instance.stopSoundLevelMonitor();
      if (roomId != null) {
        await ZegoExpressEngine.instance.logoutRoom(roomId);
      }
    } catch (e) {
      debugPrint('[Zego] error leaving room: $e');
    } finally {
      _playingStreams.clear();
      _isPublishing = false;
      _isInRoom = false;
      _isMicMuted = false;
      _currentRoomId = null;
      _currentUserId = null;
      _setState(VoiceConnectionState.disconnected);
      debugPrint('[Zego] left room=$roomId');
    }
  }

  /// Start publishing the local microphone (user took a seat).
  Future<void> startPublishing() async {
    if (!_isInRoom || _currentUserId == null) return;
    if (_isPublishing) return;

    final streamId = _streamIdFor(_currentUserId!);
    await ZegoExpressEngine.instance.muteMicrophone(false);
    await ZegoExpressEngine.instance.startPublishingStream(streamId);
    _isPublishing = true;
    _isMicMuted = false;
    debugPrint('[Zego] publishing stream=$streamId');
  }

  /// Stop publishing (user left the seat). The user keeps hearing the room.
  Future<void> stopPublishing() async {
    if (!_isPublishing) return;
    await ZegoExpressEngine.instance.stopPublishingStream();
    _isPublishing = false;
    debugPrint('[Zego] stopped publishing');
  }

  /// Mute/unmute the local microphone while staying on the seat.
  Future<void> setMicrophoneMuted(bool muted) async {
    await ZegoExpressEngine.instance.muteMicrophone(muted);
    _isMicMuted = muted;
    debugPrint('[Zego] mic ${muted ? 'muted' : 'unmuted'}');
  }

  /// Route audio to loudspeaker (true) or earpiece (false).
  Future<void> setSpeakerEnabled(bool enabled) async {
    await ZegoExpressEngine.instance.setAudioRouteToSpeaker(enabled);
  }

  /// Renew the room token before it expires (see [onTokenWillExpire]).
  Future<void> renewToken(String token) async {
    final roomId = _currentRoomId;
    if (roomId == null) return;
    await ZegoExpressEngine.instance.renewToken(roomId, token);
    debugPrint('[Zego] token renewed for room=$roomId');
  }

  /// Tear down the engine entirely (app shutdown).
  Future<void> dispose() async {
    if (!_isInitialized) return;
    await leaveRoom();

    ZegoExpressEngine.onRoomStateUpdate = null;
    ZegoExpressEngine.onRoomStreamUpdate = null;
    ZegoExpressEngine.onRoomUserUpdate = null;
    ZegoExpressEngine.onRoomTokenWillExpire = null;
    ZegoExpressEngine.onCapturedSoundLevelUpdate = null;
    ZegoExpressEngine.onRemoteSoundLevelUpdate = null;

    await ZegoExpressEngine.destroyEngine();
    _isInitialized = false;
    onStateChanged = null;
    onUsersJoined = null;
    onUsersLeft = null;
    onSpeakingLevels = null;
    onTokenWillExpire = null;
    debugPrint('[Zego] engine destroyed');
  }

  // ==================== internals ====================

  String _streamIdFor(String userId) => '${userId}_audio';

  String _userIdFromStreamId(String streamId) =>
      streamId.endsWith('_audio')
          ? streamId.substring(0, streamId.length - '_audio'.length)
          : streamId;

  void _registerEventHandlers() {
    ZegoExpressEngine.onRoomStateUpdate =
        (String roomId, ZegoRoomState state, int errorCode, Map extendedData) {
      debugPrint('[Zego] room state=$state error=$errorCode room=$roomId');
      switch (state) {
        case ZegoRoomState.Connected:
          _isInRoom = true;
          _setState(VoiceConnectionState.connected);
          break;
        case ZegoRoomState.Connecting:
          // The SDK reconnects automatically after temporary drops.
          _setState(VoiceConnectionState.connecting);
          break;
        case ZegoRoomState.Disconnected:
          _isInRoom = false;
          _setState(errorCode != 0
              ? VoiceConnectionState.failed
              : VoiceConnectionState.disconnected);
          break;
      }
    };

    // A remote user started/stopped publishing audio: play/stop their stream.
    ZegoExpressEngine.onRoomStreamUpdate = (
      String roomId,
      ZegoUpdateType updateType,
      List<ZegoStream> streamList,
      Map<String, dynamic> extendedData,
    ) async {
      for (final stream in streamList) {
        if (updateType == ZegoUpdateType.Add) {
          _playingStreams[stream.streamID] = stream.user.userID;
          await ZegoExpressEngine.instance.startPlayingStream(stream.streamID);
          debugPrint('[Zego] playing remote stream=${stream.streamID}');
        } else {
          _playingStreams.remove(stream.streamID);
          await ZegoExpressEngine.instance.stopPlayingStream(stream.streamID);
          debugPrint('[Zego] stopped remote stream=${stream.streamID}');
        }
      }
    };

    ZegoExpressEngine.onRoomUserUpdate = (
      String roomId,
      ZegoUpdateType updateType,
      List<ZegoUser> userList,
    ) {
      final ids = userList.map((u) => u.userID).toList();
      if (updateType == ZegoUpdateType.Add) {
        onUsersJoined?.call(ids);
      } else {
        onUsersLeft?.call(ids);
      }
    };

    ZegoExpressEngine.onRoomTokenWillExpire =
        (String roomId, int remainTimeInSecond) {
      debugPrint('[Zego] token expires in ${remainTimeInSecond}s');
      onTokenWillExpire?.call(roomId);
    };

    ZegoExpressEngine.onCapturedSoundLevelUpdate = (double level) {
      final me = _currentUserId;
      if (me != null && _isPublishing && !_isMicMuted) {
        onSpeakingLevels?.call({me: level});
      }
    };

    ZegoExpressEngine.onRemoteSoundLevelUpdate =
        (Map<String, double> soundLevels) {
      if (soundLevels.isEmpty) return;
      final byUser = <String, double>{};
      soundLevels.forEach((streamId, level) {
        final userId = _playingStreams[streamId] ?? _userIdFromStreamId(streamId);
        byUser[userId] = level;
      });
      onSpeakingLevels?.call(byUser);
    };
  }

  void _setState(VoiceConnectionState next) {
    if (_state == next) return;
    _state = next;
    onStateChanged?.call(next);
  }
}
