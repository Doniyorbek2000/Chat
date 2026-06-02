import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:zego_uikit_prebuilt_live_audio_room/zego_uikit_prebuilt_live_audio_room.dart';
import 'package:zego_express_engine/zego_express_engine.dart';

/// Represents the current state of a ZEGOCLOUD room connection.
enum ZegoRoomState {
  disconnected,
  connecting,
  connected,
  reconnecting,
  failed,
}

/// Callback types for room events.
typedef RoomStateChangedCallback = void Function(ZegoRoomState state);
typedef UserJoinedCallback = void Function(List<ZegoUser> users);
typedef UserLeftCallback = void Function(List<ZegoUser> users);
typedef NetworkQualityChangedCallback = void Function(int upstreamQuality, int downstreamQuality);
typedef MicrophoneStateChangedCallback = void Function(String userId, bool isMuted);

/// ZEGOCLOUD voice room service for Flutter.
/// Manages room lifecycle, audio streams, and event callbacks.
class ZegocloudService {
  static final ZegocloudService _instance = ZegocloudService._internal();
  factory ZegocloudService() => _instance;
  ZegocloudService._internal();

  // SDK state
  bool _isInitialized = false;
  bool _isInRoom = false;
  bool _isLocalAudioMuted = false;
  String? _currentRoomId;
  String? _currentUserId;

  // Reconnection state
  int _reconnectAttempts = 0;
  static const int _maxReconnectAttempts = 5;
  Timer? _reconnectTimer;
  String? _pendingRoomToken;
  String? _pendingUserName;

  // Event callbacks
  RoomStateChangedCallback? onRoomStateChanged;
  UserJoinedCallback? onUserJoined;
  UserLeftCallback? onUserLeft;
  NetworkQualityChangedCallback? onNetworkQualityChanged;
  MicrophoneStateChangedCallback? onMicrophoneStateChanged;

  // Internal state tracking
  ZegoRoomState _roomState = ZegoRoomState.disconnected;
  ZegoRoomState get roomState => _roomState;
  bool get isInitialized => _isInitialized;
  bool get isInRoom => _isInRoom;
  bool get isLocalAudioMuted => _isLocalAudioMuted;
  String? get currentRoomId => _currentRoomId;

  /// Initialize the ZEGOCLOUD Express SDK.
  /// Must be called before any other SDK operations.
  Future<void> initialize({
    required int appId,
    required String appSign,
    ZegoScenario scenario = ZegoScenario.StandardVoiceCall,
  }) async {
    if (_isInitialized) {
      debugPrint('[ZegocloudService] SDK already initialized');
      return;
    }

    try {
      // Create SDK engine
      await ZegoExpressEngine.createEngineWithProfile(
        ZegoEngineProfile(
          appId,
          scenario,
          appSign: appSign,
        ),
      );

      // Register event handlers
      _registerEventHandlers();

      // Configure audio settings
      await _configureAudioSettings();

      _isInitialized = true;
      debugPrint('[ZegocloudService] SDK initialized successfully');
    } catch (e) {
      debugPrint('[ZegocloudService] Failed to initialize SDK: $e');
      rethrow;
    }
  }

  /// Join a voice room.
  Future<void> joinRoom({
    required String roomId,
    required String userId,
    required String userName,
    required String token,
    bool autoPublishAudio = true,
  }) async {
    if (!_isInitialized) {
      throw StateError('ZEGOCLOUD SDK is not initialized. Call initialize() first.');
    }

    if (_isInRoom) {
      debugPrint('[ZegocloudService] Already in room $_currentRoomId, leaving first...');
      await leaveRoom();
    }

    try {
      _setRoomState(ZegoRoomState.connecting);
      _currentRoomId = roomId;
      _currentUserId = userId;
      _pendingRoomToken = token;
      _pendingUserName = userName;
      _reconnectAttempts = 0;

      // Configure room config
      final roomConfig = ZegoRoomConfig(
        200, // Max users
        true, // Enable user update
        token,
      );

      // Login to room
      await ZegoExpressEngine.instance.loginRoom(
        roomId,
        ZegoUser(userId, userName),
        config: roomConfig,
      );

      // Start publishing local audio if auto-publish is enabled
      if (autoPublishAudio) {
        await _startLocalAudioStream(userId);
      }

      debugPrint('[ZegocloudService] Joined room: $roomId as user: $userId');
    } catch (e) {
      _setRoomState(ZegoRoomState.failed);
      _currentRoomId = null;
      _currentUserId = null;
      debugPrint('[ZegocloudService] Failed to join room $roomId: $e');
      rethrow;
    }
  }

  /// Leave the current voice room.
  Future<void> leaveRoom() async {
    if (!_isInitialized || !_isInRoom) {
      debugPrint('[ZegocloudService] Not in a room, nothing to leave');
      return;
    }

    try {
      _cancelReconnectTimer();

      // Stop publishing audio
      await ZegoExpressEngine.instance.stopPublishingStream();

      // Logout from room
      await ZegoExpressEngine.instance.logoutRoom(_currentRoomId!);

      _isInRoom = false;
      _isLocalAudioMuted = false;
      final roomId = _currentRoomId;
      _currentRoomId = null;
      _currentUserId = null;
      _reconnectAttempts = 0;

      _setRoomState(ZegoRoomState.disconnected);
      debugPrint('[ZegocloudService] Left room: $roomId');
    } catch (e) {
      debugPrint('[ZegocloudService] Error leaving room: $e');
      // Force state reset even on error
      _isInRoom = false;
      _currentRoomId = null;
      _currentUserId = null;
      _setRoomState(ZegoRoomState.disconnected);
    }
  }

  /// Mute the local microphone.
  Future<void> muteLocalAudio() async {
    if (!_isInitialized || !_isInRoom) {
      debugPrint('[ZegocloudService] Cannot mute: not in a room');
      return;
    }

    try {
      await ZegoExpressEngine.instance.muteMicrophone(true);
      _isLocalAudioMuted = true;
      debugPrint('[ZegocloudService] Local audio muted');
      onMicrophoneStateChanged?.call(_currentUserId ?? '', true);
    } catch (e) {
      debugPrint('[ZegocloudService] Failed to mute audio: $e');
      rethrow;
    }
  }

  /// Unmute the local microphone.
  Future<void> unmuteLocalAudio() async {
    if (!_isInitialized || !_isInRoom) {
      debugPrint('[ZegocloudService] Cannot unmute: not in a room');
      return;
    }

    try {
      await ZegoExpressEngine.instance.muteMicrophone(false);
      _isLocalAudioMuted = false;
      debugPrint('[ZegocloudService] Local audio unmuted');
      onMicrophoneStateChanged?.call(_currentUserId ?? '', false);
    } catch (e) {
      debugPrint('[ZegocloudService] Failed to unmute audio: $e');
      rethrow;
    }
  }

  /// Toggle the local microphone mute state.
  Future<bool> toggleLocalAudio() async {
    if (_isLocalAudioMuted) {
      await unmuteLocalAudio();
    } else {
      await muteLocalAudio();
    }
    return _isLocalAudioMuted;
  }

  /// Enable or disable the speaker (vs. earpiece).
  Future<void> setSpeakerEnabled(bool enabled) async {
    await ZegoExpressEngine.instance.setAudioRouteToSpeaker(enabled);
    debugPrint('[ZegocloudService] Speaker ${enabled ? 'enabled' : 'disabled'}');
  }

  /// Destroy the SDK engine. Call when the app is disposed.
  Future<void> dispose() async {
    if (!_isInitialized) return;

    _cancelReconnectTimer();

    if (_isInRoom) {
      await leaveRoom();
    }

    // Unregister all event handlers
    ZegoExpressEngine.onRoomStateUpdate = null;
    ZegoExpressEngine.onRoomUserUpdate = null;
    ZegoExpressEngine.onNetworkQuality = null;
    ZegoExpressEngine.onRemoteMicStateUpdate = null;

    await ZegoExpressEngine.destroyEngine();

    _isInitialized = false;
    onRoomStateChanged = null;
    onUserJoined = null;
    onUserLeft = null;
    onNetworkQualityChanged = null;
    onMicrophoneStateChanged = null;

    debugPrint('[ZegocloudService] SDK disposed');
  }

  // ==================== PRIVATE METHODS ====================

  /// Start publishing local audio stream.
  Future<void> _startLocalAudioStream(String userId) async {
    final streamId = '${userId}_audio_${_currentRoomId}';
    await ZegoExpressEngine.instance.startPublishingStream(streamId);
    debugPrint('[ZegocloudService] Started publishing audio stream: $streamId');
  }

  /// Configure audio session settings.
  Future<void> _configureAudioSettings() async {
    // Set audio session to default to speaker
    await ZegoExpressEngine.instance.setAudioRouteToSpeaker(true);

    // Set noise suppression, echo cancellation, AGC
    await ZegoExpressEngine.instance.enableAECMode(ZegoAECMode.AI);
    await ZegoExpressEngine.instance.enableANS(true);
    await ZegoExpressEngine.instance.enableAGC(true);

    debugPrint('[ZegocloudService] Audio settings configured');
  }

  /// Register ZEGOCLOUD event handlers.
  void _registerEventHandlers() {
    // Room state changes
    ZegoExpressEngine.onRoomStateUpdate = (
      String roomId,
      ZegoRoomState state,
      int errorCode,
      Map<String, dynamic> extendedData,
    ) {
      debugPrint(
        '[ZegocloudService] Room state changed: roomId=$roomId state=$state errorCode=$errorCode',
      );
      _handleRoomStateUpdate(roomId, state, errorCode);
    };

    // User join/leave events
    ZegoExpressEngine.onRoomUserUpdate = (
      String roomId,
      ZegoUpdateType updateType,
      List<ZegoUser> userList,
    ) {
      if (updateType == ZegoUpdateType.Add) {
        debugPrint('[ZegocloudService] Users joined room $roomId: ${userList.map((u) => u.userID).toList()}');
        onUserJoined?.call(userList);
      } else {
        debugPrint('[ZegocloudService] Users left room $roomId: ${userList.map((u) => u.userID).toList()}');
        onUserLeft?.call(userList);
      }
    };

    // Network quality updates
    ZegoExpressEngine.onNetworkQuality = (
      String userId,
      ZegoStreamQualityLevel upstreamQuality,
      ZegoStreamQualityLevel downstreamQuality,
    ) {
      onNetworkQualityChanged?.call(
        upstreamQuality.index,
        downstreamQuality.index,
      );
    };

    // Remote microphone state changes
    ZegoExpressEngine.onRemoteMicStateUpdate = (
      String streamId,
      ZegoRemoteDeviceState state,
    ) {
      final isMuted = state == ZegoRemoteDeviceState.Mute;
      // Extract userId from streamId (format: userId_audio_roomId)
      final userId = streamId.split('_audio_').first;
      debugPrint('[ZegocloudService] Remote mic state: userId=$userId muted=$isMuted');
      onMicrophoneStateChanged?.call(userId, isMuted);
    };
  }

  /// Handle room state update and trigger reconnection if needed.
  void _handleRoomStateUpdate(String roomId, ZegoRoomState sdkState, int errorCode) {
    switch (sdkState) {
      case ZegoRoomState.Connected:
        _isInRoom = true;
        _reconnectAttempts = 0;
        _cancelReconnectTimer();
        _setRoomState(ZegoRoomState.connected);
        break;

      case ZegoRoomState.Connecting:
        _setRoomState(ZegoRoomState.connecting);
        break;

      case ZegoRoomState.Disconnected:
        if (_isInRoom && errorCode != 0) {
          // Unexpected disconnect - attempt reconnection
          _isInRoom = false;
          _setRoomState(ZegoRoomState.reconnecting);
          _scheduleReconnect();
        } else {
          _isInRoom = false;
          _setRoomState(ZegoRoomState.disconnected);
        }
        break;

      default:
        break;
    }
  }

  /// Schedule a reconnection attempt with exponential backoff.
  void _scheduleReconnect() {
    if (_reconnectAttempts >= _maxReconnectAttempts) {
      debugPrint('[ZegocloudService] Max reconnect attempts reached. Giving up.');
      _setRoomState(ZegoRoomState.failed);
      return;
    }

    if (_currentRoomId == null || _currentUserId == null || _pendingRoomToken == null) {
      debugPrint('[ZegocloudService] Missing room info for reconnection');
      _setRoomState(ZegoRoomState.failed);
      return;
    }

    final delay = Duration(seconds: (1 << _reconnectAttempts).clamp(1, 30));
    _reconnectAttempts++;

    debugPrint(
      '[ZegocloudService] Scheduling reconnect attempt $_reconnectAttempts in ${delay.inSeconds}s',
    );

    _reconnectTimer = Timer(delay, () async {
      if (_roomState != ZegoRoomState.reconnecting) return;

      try {
        debugPrint('[ZegocloudService] Attempting reconnection #$_reconnectAttempts...');
        await joinRoom(
          roomId: _currentRoomId!,
          userId: _currentUserId!,
          userName: _pendingUserName ?? _currentUserId!,
          token: _pendingRoomToken!,
        );
      } catch (e) {
        debugPrint('[ZegocloudService] Reconnection attempt #$_reconnectAttempts failed: $e');
        _setRoomState(ZegoRoomState.reconnecting);
        _scheduleReconnect();
      }
    });
  }

  /// Cancel any pending reconnect timer.
  void _cancelReconnectTimer() {
    _reconnectTimer?.cancel();
    _reconnectTimer = null;
  }

  /// Update room state and notify callbacks.
  void _setRoomState(ZegoRoomState state) {
    if (_roomState == state) return;
    _roomState = state;
    onRoomStateChanged?.call(state);
    debugPrint('[ZegocloudService] Room state: $state');
  }
}
