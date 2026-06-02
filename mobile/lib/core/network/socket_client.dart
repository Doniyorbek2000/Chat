import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../constants/api_constants.dart';
import '../storage/secure_storage.dart';

typedef SocketEventCallback = void Function(dynamic data);

class SocketClient {
  static SocketClient? _instance;
  io.Socket? _socket;

  // Stream controllers for room events
  final _roomJoinController = StreamController<Map<String, dynamic>>.broadcast();
  final _roomLeaveController = StreamController<Map<String, dynamic>>.broadcast();
  final _seatUpdateController = StreamController<Map<String, dynamic>>.broadcast();
  final _micUpdateController = StreamController<Map<String, dynamic>>.broadcast();
  final _chatMessageController = StreamController<Map<String, dynamic>>.broadcast();
  final _giftEventController = StreamController<Map<String, dynamic>>.broadcast();
  final _pkUpdateController = StreamController<Map<String, dynamic>>.broadcast();
  final _viewerCountController = StreamController<int>.broadcast();
  final _roomClosedController = StreamController<String>.broadcast();
  final _systemMessageController = StreamController<Map<String, dynamic>>.broadcast();
  final _onlineStatusController = StreamController<Map<String, dynamic>>.broadcast();
  final _typingController = StreamController<Map<String, dynamic>>.broadcast();
  final _privateMessageController = StreamController<Map<String, dynamic>>.broadcast();
  final _notificationController = StreamController<Map<String, dynamic>>.broadcast();
  final _entryEffectController = StreamController<Map<String, dynamic>>.broadcast();

  bool _isConnected = false;
  bool _isConnecting = false;
  String? _currentRoomId;

  SocketClient._();

  static SocketClient get instance {
    _instance ??= SocketClient._();
    return _instance!;
  }

  bool get isConnected => _isConnected;
  String? get currentRoomId => _currentRoomId;

  // Streams
  Stream<Map<String, dynamic>> get onRoomJoin => _roomJoinController.stream;
  Stream<Map<String, dynamic>> get onRoomLeave => _roomLeaveController.stream;
  Stream<Map<String, dynamic>> get onSeatUpdate => _seatUpdateController.stream;
  Stream<Map<String, dynamic>> get onMicUpdate => _micUpdateController.stream;
  Stream<Map<String, dynamic>> get onChatMessage => _chatMessageController.stream;
  Stream<Map<String, dynamic>> get onGiftEvent => _giftEventController.stream;
  Stream<Map<String, dynamic>> get onPkUpdate => _pkUpdateController.stream;
  Stream<int> get onViewerCount => _viewerCountController.stream;
  Stream<String> get onRoomClosed => _roomClosedController.stream;
  Stream<Map<String, dynamic>> get onSystemMessage => _systemMessageController.stream;
  Stream<Map<String, dynamic>> get onOnlineStatus => _onlineStatusController.stream;
  Stream<Map<String, dynamic>> get onTyping => _typingController.stream;
  Stream<Map<String, dynamic>> get onPrivateMessage => _privateMessageController.stream;
  Stream<Map<String, dynamic>> get onNotification => _notificationController.stream;
  Stream<Map<String, dynamic>> get onEntryEffect => _entryEffectController.stream;

  Future<void> connect() async {
    if (_isConnected || _isConnecting) return;

    _isConnecting = true;
    final token = await SecureStorageService.getAccessToken();

    _socket = io.io(
      ApiConstants.wsUrl,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .enableAutoConnect()
          .enableReconnection()
          .setReconnectionAttempts(10)
          .setReconnectionDelay(1000)
          .setReconnectionDelayMax(5000)
          .setAuth({'token': token ?? ''})
          .setExtraHeaders({'Authorization': 'Bearer ${token ?? ''}'})
          .build(),
    );

    _socket!.onConnect((_) {
      _isConnected = true;
      _isConnecting = false;
      debugPrint('Socket connected: ${_socket!.id}');
    });

    _socket!.onDisconnect((_) {
      _isConnected = false;
      debugPrint('Socket disconnected');
    });

    _socket!.onConnectError((error) {
      _isConnecting = false;
      debugPrint('Socket connection error: $error');
    });

    _socket!.onError((error) {
      debugPrint('Socket error: $error');
    });

    _setupEventListeners();
    _socket!.connect();
  }

  void _setupEventListeners() {
    // Room events
    _socket!.on('room:user_joined', (data) {
      _roomJoinController.add(Map<String, dynamic>.from(data));
    });

    _socket!.on('room:user_left', (data) {
      _roomLeaveController.add(Map<String, dynamic>.from(data));
    });

    _socket!.on('room:seat_updated', (data) {
      _seatUpdateController.add(Map<String, dynamic>.from(data));
    });

    _socket!.on('room:mic_updated', (data) {
      _micUpdateController.add(Map<String, dynamic>.from(data));
    });

    _socket!.on('room:viewer_count', (data) {
      if (data is int) {
        _viewerCountController.add(data);
      } else if (data is Map) {
        _viewerCountController.add(data['count'] as int? ?? 0);
      }
    });

    _socket!.on('room:closed', (data) {
      final roomId = data is String ? data : (data as Map)['roomId'] as String;
      _roomClosedController.add(roomId);
    });

    _socket!.on('room:entry_effect', (data) {
      _entryEffectController.add(Map<String, dynamic>.from(data));
    });

    // Chat events
    _socket!.on('chat:message', (data) {
      _chatMessageController.add(Map<String, dynamic>.from(data));
    });

    _socket!.on('chat:system', (data) {
      _systemMessageController.add(Map<String, dynamic>.from(data));
    });

    // Gift events
    _socket!.on('gift:sent', (data) {
      _giftEventController.add(Map<String, dynamic>.from(data));
    });

    // PK events
    _socket!.on('pk:update', (data) {
      _pkUpdateController.add(Map<String, dynamic>.from(data));
    });

    _socket!.on('pk:started', (data) {
      _pkUpdateController.add({
        ...Map<String, dynamic>.from(data),
        'event': 'started',
      });
    });

    _socket!.on('pk:ended', (data) {
      _pkUpdateController.add({
        ...Map<String, dynamic>.from(data),
        'event': 'ended',
      });
    });

    // User status
    _socket!.on('user:online_status', (data) {
      _onlineStatusController.add(Map<String, dynamic>.from(data));
    });

    // Private messages
    _socket!.on('message:new', (data) {
      _privateMessageController.add(Map<String, dynamic>.from(data));
    });

    _socket!.on('message:typing', (data) {
      _typingController.add(Map<String, dynamic>.from(data));
    });

    // Notifications
    _socket!.on('notification:new', (data) {
      _notificationController.add(Map<String, dynamic>.from(data));
    });
  }

  // Room actions
  void joinRoom(String roomId) {
    _currentRoomId = roomId;
    _socket?.emit('room:join', {'roomId': roomId});
  }

  void leaveRoom(String roomId) {
    _socket?.emit('room:leave', {'roomId': roomId});
    if (_currentRoomId == roomId) {
      _currentRoomId = null;
    }
  }

  void takeSeat(String roomId, int seatIndex) {
    _socket?.emit('room:take_seat', {
      'roomId': roomId,
      'seatIndex': seatIndex,
    });
  }

  void leaveSeat(String roomId) {
    _socket?.emit('room:leave_seat', {'roomId': roomId});
  }

  void toggleMic(String roomId, bool isOn) {
    _socket?.emit('room:toggle_mic', {
      'roomId': roomId,
      'isOn': isOn,
    });
  }

  void sendGift({
    required String roomId,
    required String giftId,
    required int count,
    String? targetUserId,
  }) {
    _socket?.emit('gift:send', {
      'roomId': roomId,
      'giftId': giftId,
      'count': count,
      if (targetUserId != null) 'targetUserId': targetUserId,
    });
  }

  // Chat actions
  void sendChatMessage(String roomId, String content) {
    _socket?.emit('chat:send', {
      'roomId': roomId,
      'content': content,
    });
  }

  // Private message actions
  void sendPrivateMessage({
    required String toUserId,
    required String content,
    String type = 'text',
    Map<String, dynamic>? extra,
  }) {
    _socket?.emit('message:send', {
      'toUserId': toUserId,
      'content': content,
      'type': type,
      if (extra != null) ...extra,
    });
  }

  void sendTyping(String toUserId, bool isTyping) {
    _socket?.emit('message:typing', {
      'toUserId': toUserId,
      'isTyping': isTyping,
    });
  }

  // Subscribe to user online status
  void subscribeToUser(String userId) {
    _socket?.emit('user:subscribe', {'userId': userId});
  }

  void unsubscribeFromUser(String userId) {
    _socket?.emit('user:unsubscribe', {'userId': userId});
  }

  void emit(String event, dynamic data) {
    _socket?.emit(event, data);
  }

  void on(String event, SocketEventCallback callback) {
    _socket?.on(event, callback);
  }

  void off(String event) {
    _socket?.off(event);
  }

  void disconnect() {
    _socket?.disconnect();
    _isConnected = false;
  }

  void dispose() {
    _socket?.dispose();
    _roomJoinController.close();
    _roomLeaveController.close();
    _seatUpdateController.close();
    _micUpdateController.close();
    _chatMessageController.close();
    _giftEventController.close();
    _pkUpdateController.close();
    _viewerCountController.close();
    _roomClosedController.close();
    _systemMessageController.close();
    _onlineStatusController.close();
    _typingController.close();
    _privateMessageController.close();
    _notificationController.close();
    _entryEffectController.close();
  }
}
