import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:permission_handler/permission_handler.dart';
import '../config/app_config.dart';
import '../models/room_model.dart';
import '../models/gift_model.dart';
import '../network/api_client.dart';
import '../network/socket_client.dart';
import '../constants/api_constants.dart';
import '../services/zegocloud_service.dart';
import 'auth_provider.dart';

class RoomState {
  final RoomModel? room;
  final bool isLoading;
  final bool isMicOn;
  final bool isInRoom;
  final int? mySeatIndex;
  final List<RoomMessageModel> messages;
  final List<GiftEventModel> activeGifts;
  final String? error;
  final bool isChatOpen;
  final VoiceConnectionState voiceState;
  final Map<String, double> speakingLevels;

  const RoomState({
    this.room,
    this.isLoading = false,
    this.isMicOn = false,
    this.isInRoom = false,
    this.mySeatIndex,
    this.messages = const [],
    this.activeGifts = const [],
    this.error,
    this.isChatOpen = false,
    this.voiceState = VoiceConnectionState.disconnected,
    this.speakingLevels = const {},
  });

  RoomState copyWith({
    RoomModel? room,
    bool? isLoading,
    bool? isMicOn,
    bool? isInRoom,
    int? mySeatIndex,
    bool clearSeatIndex = false,
    List<RoomMessageModel>? messages,
    List<GiftEventModel>? activeGifts,
    String? error,
    bool? isChatOpen,
    VoiceConnectionState? voiceState,
    Map<String, double>? speakingLevels,
  }) {
    return RoomState(
      room: room ?? this.room,
      isLoading: isLoading ?? this.isLoading,
      isMicOn: isMicOn ?? this.isMicOn,
      isInRoom: isInRoom ?? this.isInRoom,
      mySeatIndex: clearSeatIndex ? null : (mySeatIndex ?? this.mySeatIndex),
      messages: messages ?? this.messages,
      activeGifts: activeGifts ?? this.activeGifts,
      error: error ?? this.error,
      isChatOpen: isChatOpen ?? this.isChatOpen,
      voiceState: voiceState ?? this.voiceState,
      speakingLevels: speakingLevels ?? this.speakingLevels,
    );
  }

  bool get isOnSeat => mySeatIndex != null;
  bool get isVoiceConnected => voiceState == VoiceConnectionState.connected;
}

class RoomNotifier extends StateNotifier<RoomState> {
  final ApiClient _apiClient;
  final Ref _ref;
  final List<StreamSubscription> _subscriptions = [];
  final ZegocloudService _voice = ZegocloudService();

  RoomNotifier(this._apiClient, this._ref) : super(const RoomState());

  Future<void> joinRoom(String roomId, {String? password}) async {
    state = state.copyWith(isLoading: true);
    try {
      final response = await _apiClient.post(
        ApiConstants.joinRoom.replaceFirst('{id}', roomId),
        data: {
          if (password != null) 'password': password,
        },
      );

      // Backend returns { room, token: { token, expiresAt } }.
      final data = response.data as Map<String, dynamic>;
      final roomJson = (data['room'] ?? data) as Map<String, dynamic>;
      final zegoToken =
          (data['token'] as Map<String, dynamic>?)?['token'] as String?;

      // The join payload is a bare room row; fetch the full room
      // (host, seats, recent messages) from the detail endpoint.
      RoomModel room;
      try {
        final detail = await _apiClient.get(
          ApiConstants.roomById.replaceFirst('{id}', roomId),
        );
        room = RoomModel.fromJson(detail.data as Map<String, dynamic>);
      } catch (_) {
        room = RoomModel.fromJson(roomJson);
      }

      state = RoomState(
        room: room,
        isLoading: false,
        isInRoom: true,
        mySeatIndex: room.userSeatIndex,
        messages: List.from(room.recentMessages),
      );

      SocketClient.instance.joinRoom(roomId);
      _setupSocketListeners(roomId);

      // Connect the real audio channel. Failure is non-fatal: the user can
      // still see the room, chat and send gifts.
      await _connectVoice(roomId, zegoToken);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  Future<void> leaveRoom() async {
    final roomId = state.room?.id;
    if (roomId == null) return;

    await _voice.leaveRoom();

    try {
      await _apiClient.post(
        ApiConstants.leaveRoom.replaceFirst('{id}', roomId),
      );
    } catch (_) {}

    SocketClient.instance.leaveRoom(roomId);
    _cancelSubscriptions();
    state = const RoomState();
  }

  Future<void> takeSeat(int seatIndex) async {
    final roomId = state.room?.id;
    if (roomId == null) return;

    // Speaking requires the microphone — ask before occupying the seat.
    final permission = await Permission.microphone.request();
    if (!permission.isGranted) {
      state = state.copyWith(
        error: 'Microphone permission is required to take a seat',
      );
      return;
    }

    try {
      await _apiClient.post(
        ApiConstants.takeSeat
            .replaceFirst('{id}', roomId)
            .replaceFirst('{seatIndex}', seatIndex.toString()),
      );
      SocketClient.instance.takeSeat(roomId, seatIndex);

      await _startSpeaking();
      state = state.copyWith(mySeatIndex: seatIndex, isMicOn: true);
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  Future<void> leaveSeat() async {
    final roomId = state.room?.id;
    final seatIndex = state.mySeatIndex;
    if (roomId == null || seatIndex == null) return;

    try {
      await _apiClient.post(
        ApiConstants.leaveSeat
            .replaceFirst('{id}', roomId)
            .replaceFirst('{seatIndex}', seatIndex.toString()),
      );
      SocketClient.instance.leaveSeat(roomId);
      await _voice.stopPublishing();
      state = state.copyWith(clearSeatIndex: true, isMicOn: false);
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  Future<void> toggleMic() async {
    final roomId = state.room?.id;
    if (roomId == null) return;
    // Only seated users have a microphone to toggle.
    if (!state.isOnSeat) return;

    final newMicState = !state.isMicOn;
    try {
      await _voice.setMicrophoneMuted(!newMicState);
    } catch (_) {}
    state = state.copyWith(isMicOn: newMicState);
    SocketClient.instance.toggleMic(roomId, newMicState);
  }

  void sendChatMessage(String content) {
    final roomId = state.room?.id;
    if (roomId == null) return;
    SocketClient.instance.sendChatMessage(roomId, content);
  }

  void toggleChat() {
    state = state.copyWith(isChatOpen: !state.isChatOpen);
  }

  void removeGiftFromQueue(String giftEventId) {
    final updatedGifts = state.activeGifts
        .where((g) => g.id != giftEventId)
        .toList();
    state = state.copyWith(activeGifts: updatedGifts);
  }

  // ==================== voice (ZEGOCLOUD) ====================

  Future<void> _connectVoice(String roomId, String? token) async {
    if (token == null) return;
    if (!AppConfig.isVoiceConfigured) return;

    final user = _ref.read(authProvider).user;
    if (user == null) return;

    try {
      await _voice.initialize(appId: AppConfig.zegoAppId);

      _voice.onStateChanged = (voiceState) {
        if (!mounted) return;
        state = state.copyWith(voiceState: voiceState);
      };
      _voice.onTokenWillExpire = (rid) => _renewVoiceToken(rid);
      _voice.onSpeakingLevels = _handleSpeakingLevels;

      await _voice.joinRoom(
        roomId: roomId,
        userId: user.id,
        userName: user.displayName,
        token: token,
      );
    } catch (e) {
      if (!mounted) return;
      state = state.copyWith(voiceState: VoiceConnectionState.failed);
    }
  }

  Future<void> _startSpeaking() async {
    if (!_voice.isInRoom) {
      // Voice channel may have failed on join — retry with a fresh token.
      final roomId = state.room?.id;
      if (roomId != null) {
        final token = await _fetchVoiceToken(roomId);
        await _connectVoice(roomId, token);
      }
    }
    await _voice.startPublishing();
  }

  Future<String?> _fetchVoiceToken(String roomId) async {
    try {
      final response = await _apiClient.post(
        ApiConstants.zegoToken.replaceFirst('{id}', roomId),
      );
      final data = response.data as Map<String, dynamic>;
      return (data['token'] as Map<String, dynamic>?)?['token'] as String?;
    } catch (_) {
      return null;
    }
  }

  Future<void> _renewVoiceToken(String roomId) async {
    final token = await _fetchVoiceToken(roomId);
    if (token != null) {
      await _voice.renewToken(token);
    }
  }

  void _handleSpeakingLevels(Map<String, double> levels) {
    if (!mounted) return;
    final merged = Map<String, double>.from(state.speakingLevels)
      ..addAll(levels);
    merged.removeWhere((_, level) => level < 1);
    state = state.copyWith(speakingLevels: merged);
  }

  // ==================== socket listeners ====================

  void _setupSocketListeners(String roomId) {
    final socket = SocketClient.instance;

    _subscriptions.add(
      socket.onSeatUpdate.listen((data) {
        _handleSeatUpdate(data);
      }),
    );

    _subscriptions.add(
      socket.onMicUpdate.listen((data) {
        _handleMicUpdate(data);
      }),
    );

    _subscriptions.add(
      socket.onChatMessage.listen((data) {
        _handleChatMessage(data);
      }),
    );

    _subscriptions.add(
      socket.onGiftEvent.listen((data) {
        _handleGiftEvent(data);
      }),
    );

    _subscriptions.add(
      socket.onViewerCount.listen((count) {
        if (state.room != null) {
          state = state.copyWith(
            room: RoomModel.fromJson({
              ...state.room!.toJson(),
              'viewerCount': count,
            }),
          );
        }
      }),
    );

    _subscriptions.add(
      socket.onRoomJoin.listen((data) {
        final message = RoomMessageModel(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          roomId: roomId,
          userId: data['userId'] as String? ?? '',
          username: data['username'] as String? ?? 'User',
          userAvatar: data['avatar'] as String?,
          userVipLevel: (data['vipLevel'] as num?)?.toInt() ?? 0,
          type: 'join',
          content: '${data['username']} joined',
          timestamp: DateTime.now(),
        );
        _addMessage(message);
      }),
    );

    _subscriptions.add(
      socket.onPkUpdate.listen((data) {
        _handlePkUpdate(data);
      }),
    );
  }

  void _handleSeatUpdate(Map<String, dynamic> data) {
    if (state.room == null) return;
    final seats = List<SeatModel>.from(state.room!.seats);
    final index = data['seatIndex'] as int?;
    if (index == null || index >= seats.length) return;

    final updatedSeat = SeatModel.fromJson(data['seat'] as Map<String, dynamic>);
    seats[index] = updatedSeat;

    state = state.copyWith(
      room: RoomModel.fromJson({
        ...state.room!.toJson(),
        'seats': seats.map((s) => s.toJson()).toList(),
      }),
    );
  }

  /// Host/admin muted someone (room:muted). If it's us, silence the real mic.
  void _handleMicUpdate(Map<String, dynamic> data) {
    final myId = _ref.read(authProvider).user?.id;
    final targetId = data['userId'] as String?;
    final muted = data['muted'] as bool?;
    if (myId == null || targetId != myId || muted == null) return;

    _voice.setMicrophoneMuted(muted).catchError((_) {});
    state = state.copyWith(isMicOn: !muted);
  }

  void _handleChatMessage(Map<String, dynamic> data) {
    final message = RoomMessageModel.fromJson(data);
    _addMessage(message);
  }

  void _addMessage(RoomMessageModel message) {
    final messages = List<RoomMessageModel>.from(state.messages);
    messages.add(message);
    // Keep max 500 messages
    if (messages.length > 500) {
      messages.removeAt(0);
    }
    state = state.copyWith(messages: messages);
  }

  void _handleGiftEvent(Map<String, dynamic> data) {
    try {
      final giftEvent = GiftEventModel.fromJson(data);
      final activeGifts = List<GiftEventModel>.from(state.activeGifts);

      // Max 5 simultaneous gift animations
      if (activeGifts.length >= 5) {
        activeGifts.removeAt(0);
      }
      activeGifts.add(giftEvent);
      state = state.copyWith(activeGifts: activeGifts);

      // Add gift message to chat
      final message = RoomMessageModel(
        id: giftEvent.id,
        roomId: giftEvent.roomId,
        userId: giftEvent.senderId,
        username: giftEvent.senderName,
        userAvatar: giftEvent.senderAvatar,
        userVipLevel: giftEvent.senderVipLevel,
        type: 'gift',
        content:
            '${giftEvent.senderName} sent ${giftEvent.gift.name} x${giftEvent.count}',
        extra: {'giftId': giftEvent.gift.id, 'count': giftEvent.count},
        timestamp: giftEvent.timestamp,
      );
      _addMessage(message);
    } catch (_) {}
  }

  void _handlePkUpdate(Map<String, dynamic> data) {
    if (state.room == null) return;
    // Update pk battle in room
  }

  void _cancelSubscriptions() {
    for (final sub in _subscriptions) {
      sub.cancel();
    }
    _subscriptions.clear();
  }

  @override
  void dispose() {
    _cancelSubscriptions();
    _voice.leaveRoom();
    super.dispose();
  }
}

final roomProvider =
    StateNotifierProvider<RoomNotifier, RoomState>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return RoomNotifier(apiClient, ref);
});

final currentRoomProvider = Provider<RoomModel?>((ref) {
  return ref.watch(roomProvider).room;
});

final roomMessagesProvider = Provider<List<RoomMessageModel>>((ref) {
  return ref.watch(roomProvider).messages;
});

final activeGiftsProvider = Provider<List<GiftEventModel>>((ref) {
  return ref.watch(roomProvider).activeGifts;
});

/// Live speaking levels (userId -> 0..100) for seat "speaking" glow.
final speakingLevelsProvider = Provider<Map<String, double>>((ref) {
  return ref.watch(roomProvider).speakingLevels;
});

/// Voice channel connection state, for showing a reconnect banner in UI.
final voiceStateProvider = Provider<VoiceConnectionState>((ref) {
  return ref.watch(roomProvider).voiceState;
});
