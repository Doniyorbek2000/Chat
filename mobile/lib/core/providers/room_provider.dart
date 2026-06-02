import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/room_model.dart';
import '../models/gift_model.dart';
import '../network/api_client.dart';
import '../network/socket_client.dart';
import '../constants/api_constants.dart';
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
  });

  RoomState copyWith({
    RoomModel? room,
    bool? isLoading,
    bool? isMicOn,
    bool? isInRoom,
    int? mySeatIndex,
    List<RoomMessageModel>? messages,
    List<GiftEventModel>? activeGifts,
    String? error,
    bool? isChatOpen,
  }) {
    return RoomState(
      room: room ?? this.room,
      isLoading: isLoading ?? this.isLoading,
      isMicOn: isMicOn ?? this.isMicOn,
      isInRoom: isInRoom ?? this.isInRoom,
      mySeatIndex: mySeatIndex ?? this.mySeatIndex,
      messages: messages ?? this.messages,
      activeGifts: activeGifts ?? this.activeGifts,
      error: error ?? this.error,
      isChatOpen: isChatOpen ?? this.isChatOpen,
    );
  }

  bool get isHost =>
      room != null && room!.host.id == room!.host.id; // override in notifier
}

class RoomNotifier extends StateNotifier<RoomState> {
  final ApiClient _apiClient;
  final Ref _ref;
  final List<StreamSubscription> _subscriptions = [];

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

      final room = RoomModel.fromJson(response.data as Map<String, dynamic>);
      state = RoomState(
        room: room,
        isLoading: false,
        isInRoom: true,
        mySeatIndex: room.userSeatIndex,
        messages: List.from(room.recentMessages),
      );

      SocketClient.instance.joinRoom(roomId);
      _setupSocketListeners(roomId);
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

    try {
      await _apiClient.post(
        ApiConstants.takeSeat
            .replaceFirst('{id}', roomId)
            .replaceFirst('{seatIndex}', seatIndex.toString()),
      );
      SocketClient.instance.takeSeat(roomId, seatIndex);
      state = state.copyWith(mySeatIndex: seatIndex);
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  Future<void> leaveSeat() async {
    final roomId = state.room?.id;
    if (roomId == null) return;

    try {
      await _apiClient.post(
        ApiConstants.leaveSeat.replaceFirst('{id}', roomId),
      );
      SocketClient.instance.leaveSeat(roomId);
      state = state.copyWith(mySeatIndex: null);
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  void toggleMic() {
    final roomId = state.room?.id;
    if (roomId == null) return;

    final newMicState = !state.isMicOn;
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

  void _setupSocketListeners(String roomId) {
    final socket = SocketClient.instance;

    _subscriptions.add(
      socket.onSeatUpdate.listen((data) {
        _handleSeatUpdate(data);
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
