import 'dart:async';
import 'dart:io';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

/// Notification tap action data
class NotificationTapData {
  final String? type;
  final String? targetId;
  final Map<String, dynamic> payload;

  const NotificationTapData({
    this.type,
    this.targetId,
    required this.payload,
  });

  factory NotificationTapData.fromMessage(RemoteMessage message) {
    final data = message.data;
    return NotificationTapData(
      type: data['type']?.toString(),
      targetId: data['targetId']?.toString(),
      payload: Map<String, dynamic>.from(data),
    );
  }
}

/// Callback for handling notification navigation
typedef NotificationTapCallback = void Function(NotificationTapData data);

/// Firebase Cloud Messaging + Local Notifications service.
/// Handles foreground, background, and terminated state notifications.
class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FirebaseMessaging _firebaseMessaging = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();

  bool _isInitialized = false;
  String? _fcmToken;
  NotificationTapCallback? onNotificationTapped;

  // Stream controller for incoming notifications
  final StreamController<RemoteMessage> _notificationStreamController =
      StreamController<RemoteMessage>.broadcast();

  Stream<RemoteMessage> get notificationStream =>
      _notificationStreamController.stream;

  String? get fcmToken => _fcmToken;
  bool get isInitialized => _isInitialized;

  // ==================== ANDROID NOTIFICATION CHANNELS ====================

  static const AndroidNotificationChannel _defaultChannel = AndroidNotificationChannel(
    'voxo_default',
    'General Notifications',
    description: 'General VOXO platform notifications',
    importance: Importance.high,
    playSound: true,
  );

  static const AndroidNotificationChannel _giftChannel = AndroidNotificationChannel(
    'voxo_gifts',
    'Gift Notifications',
    description: 'Notifications for received gifts',
    importance: Importance.high,
    playSound: true,
    enableVibration: true,
  );

  static const AndroidNotificationChannel _roomChannel = AndroidNotificationChannel(
    'voxo_rooms',
    'Room Notifications',
    description: 'Voice room invitations and updates',
    importance: Importance.max,
    playSound: true,
    enableVibration: true,
  );

  static const AndroidNotificationChannel _chatChannel = AndroidNotificationChannel(
    'voxo_chat',
    'Chat Notifications',
    description: 'Private message notifications',
    importance: Importance.high,
    playSound: true,
  );

  // ==================== INITIALIZATION ====================

  /// Initialize the notification service.
  /// Must be called after Firebase.initializeApp().
  Future<void> initialize({
    NotificationTapCallback? onTap,
  }) async {
    if (_isInitialized) {
      debugPrint('[NotificationService] Already initialized');
      return;
    }

    onNotificationTapped = onTap;

    try {
      // Request permissions
      await _requestPermissions();

      // Initialize local notifications
      await _initializeLocalNotifications();

      // Create Android notification channels
      await _createNotificationChannels();

      // Configure Firebase Messaging handlers
      _configureFirebaseHandlers();

      // Get and store FCM token
      await _fetchAndStoreFcmToken();

      // Set up token refresh listener
      _setupTokenRefreshListener();

      _isInitialized = true;
      debugPrint('[NotificationService] Initialized successfully. Token: $_fcmToken');
    } catch (e) {
      debugPrint('[NotificationService] Initialization failed: $e');
      rethrow;
    }
  }

  // ==================== PERMISSIONS ====================

  /// Request notification permissions from the user.
  Future<NotificationSettings> _requestPermissions() async {
    final settings = await _firebaseMessaging.requestPermission(
      alert: true,
      announcement: false,
      badge: true,
      carPlay: false,
      criticalAlert: false,
      provisional: false,
      sound: true,
    );

    debugPrint(
      '[NotificationService] Permission status: ${settings.authorizationStatus}',
    );

    if (settings.authorizationStatus == AuthorizationStatus.denied) {
      debugPrint('[NotificationService] User denied notification permissions');
    }

    return settings;
  }

  // ==================== LOCAL NOTIFICATIONS SETUP ====================

  Future<void> _initializeLocalNotifications() async {
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    const initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _localNotifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: _onLocalNotificationTapped,
      onDidReceiveBackgroundNotificationResponse: _onBackgroundLocalNotificationTapped,
    );
  }

  Future<void> _createNotificationChannels() async {
    if (!Platform.isAndroid) return;

    final androidPlugin = _localNotifications
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>();

    if (androidPlugin != null) {
      await androidPlugin.createNotificationChannel(_defaultChannel);
      await androidPlugin.createNotificationChannel(_giftChannel);
      await androidPlugin.createNotificationChannel(_roomChannel);
      await androidPlugin.createNotificationChannel(_chatChannel);
    }
  }

  // ==================== FIREBASE HANDLERS ====================

  void _configureFirebaseHandlers() {
    // Foreground messages
    FirebaseMessaging.onMessage.listen(_handleForegroundMessage);

    // Background messages (when app is backgrounded but not terminated)
    FirebaseMessaging.onMessageOpenedApp.listen(_handleMessageOpenedApp);

    // Check for initial message (app opened from terminated state)
    _handleInitialMessage();
  }

  /// Handle messages received while the app is in the foreground.
  Future<void> _handleForegroundMessage(RemoteMessage message) async {
    debugPrint(
      '[NotificationService] Foreground message received: ${message.messageId}',
    );

    // Add to stream for in-app handling
    _notificationStreamController.add(message);

    // Show local notification for foreground messages
    await _showLocalNotification(message);
  }

  /// Handle notification tap when app was in background.
  void _handleMessageOpenedApp(RemoteMessage message) {
    debugPrint(
      '[NotificationService] App opened from background notification: ${message.messageId}',
    );
    _handleNotificationNavigation(message);
  }

  /// Handle notification tap when app was terminated.
  Future<void> _handleInitialMessage() async {
    final initialMessage = await _firebaseMessaging.getInitialMessage();
    if (initialMessage != null) {
      debugPrint(
        '[NotificationService] App opened from terminated state via notification: ${initialMessage.messageId}',
      );
      // Slight delay to allow the app to fully initialize before navigating
      await Future.delayed(const Duration(milliseconds: 500));
      _handleNotificationNavigation(initialMessage);
    }
  }

  /// Display a local notification for a received FCM message.
  Future<void> _showLocalNotification(RemoteMessage message) async {
    final notification = message.notification;
    if (notification == null) return;

    final channelId = _getChannelIdForMessage(message);
    final androidDetails = AndroidNotificationDetails(
      channelId,
      _getChannelNameForId(channelId),
      channelDescription: _getChannelDescriptionForId(channelId),
      importance: Importance.high,
      priority: Priority.high,
      icon: '@mipmap/ic_launcher',
      largeIcon: const DrawableResourceAndroidBitmap('@mipmap/ic_launcher'),
      styleInformation: notification.body != null
          ? BigTextStyleInformation(notification.body!)
          : null,
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    final details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _localNotifications.show(
      message.hashCode,
      notification.title,
      notification.body,
      details,
      payload: _encodePayload(message.data),
    );
  }

  // ==================== LOCAL NOTIFICATION CALLBACKS ====================

  void _onLocalNotificationTapped(NotificationResponse response) {
    debugPrint('[NotificationService] Local notification tapped: ${response.payload}');
    if (response.payload != null) {
      final data = _decodePayload(response.payload!);
      onNotificationTapped?.call(
        NotificationTapData(
          type: data['type']?.toString(),
          targetId: data['targetId']?.toString(),
          payload: data,
        ),
      );
    }
  }

  // ==================== NAVIGATION HANDLING ====================

  void _handleNotificationNavigation(RemoteMessage message) {
    final tapData = NotificationTapData.fromMessage(message);
    onNotificationTapped?.call(tapData);
    debugPrint(
      '[NotificationService] Navigation triggered: type=${tapData.type} targetId=${tapData.targetId}',
    );
  }

  // ==================== FCM TOKEN ====================

  Future<void> _fetchAndStoreFcmToken() async {
    try {
      _fcmToken = await _firebaseMessaging.getToken();
      debugPrint('[NotificationService] FCM Token: $_fcmToken');
    } catch (e) {
      debugPrint('[NotificationService] Failed to get FCM token: $e');
    }
  }

  void _setupTokenRefreshListener() {
    _firebaseMessaging.onTokenRefresh.listen((newToken) {
      debugPrint('[NotificationService] FCM token refreshed: $newToken');
      _fcmToken = newToken;
      // Token should be sent to the backend to update the user's FCM token
    });
  }

  // ==================== PUBLIC API ====================

  /// Get the current FCM token, refreshing if needed.
  Future<String?> getToken({bool forceRefresh = false}) async {
    if (forceRefresh || _fcmToken == null) {
      await _fetchAndStoreFcmToken();
    }
    return _fcmToken;
  }

  /// Update the notification tap callback (e.g., after navigation is available).
  void setNotificationTapCallback(NotificationTapCallback callback) {
    onNotificationTapped = callback;
  }

  /// Subscribe to a topic for targeted notifications.
  Future<void> subscribeToTopic(String topic) async {
    await _firebaseMessaging.subscribeToTopic(topic);
    debugPrint('[NotificationService] Subscribed to topic: $topic');
  }

  /// Unsubscribe from a topic.
  Future<void> unsubscribeFromTopic(String topic) async {
    await _firebaseMessaging.unsubscribeFromTopic(topic);
    debugPrint('[NotificationService] Unsubscribed from topic: $topic');
  }

  /// Clear all displayed notifications.
  Future<void> clearAllNotifications() async {
    await _localNotifications.cancelAll();
  }

  /// Cancel a specific notification by ID.
  Future<void> cancelNotification(int id) async {
    await _localNotifications.cancel(id);
  }

  /// Update badge count (iOS).
  Future<void> setBadgeCount(int count) async {
    await _firebaseMessaging.setForegroundNotificationPresentationOptions(
      alert: count > 0,
      badge: true,
      sound: count > 0,
    );
  }

  /// Dispose the notification service streams.
  void dispose() {
    _notificationStreamController.close();
  }

  // ==================== HELPERS ====================

  String _getChannelIdForMessage(RemoteMessage message) {
    final type = message.data['type']?.toString();
    switch (type) {
      case 'gift':
      case 'gift_received':
        return _giftChannel.id;
      case 'room_invite':
      case 'room_join':
        return _roomChannel.id;
      case 'chat':
      case 'private_message':
        return _chatChannel.id;
      default:
        return _defaultChannel.id;
    }
  }

  String _getChannelNameForId(String channelId) {
    switch (channelId) {
      case 'voxo_gifts':
        return _giftChannel.name;
      case 'voxo_rooms':
        return _roomChannel.name;
      case 'voxo_chat':
        return _chatChannel.name;
      default:
        return _defaultChannel.name;
    }
  }

  String _getChannelDescriptionForId(String channelId) {
    switch (channelId) {
      case 'voxo_gifts':
        return _giftChannel.description ?? '';
      case 'voxo_rooms':
        return _roomChannel.description ?? '';
      case 'voxo_chat':
        return _chatChannel.description ?? '';
      default:
        return _defaultChannel.description ?? '';
    }
  }

  String _encodePayload(Map<String, dynamic> data) {
    return data.entries.map((e) => '${e.key}=${e.value}').join('&');
  }

  Map<String, dynamic> _decodePayload(String payload) {
    final result = <String, dynamic>{};
    for (final part in payload.split('&')) {
      final index = part.indexOf('=');
      if (index > 0) {
        result[part.substring(0, index)] = part.substring(index + 1);
      }
    }
    return result;
  }
}

/// Background message handler — must be a top-level function.
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // Ensure Firebase is initialized in the background isolate
  await Firebase.initializeApp();

  debugPrint(
    '[NotificationService] Background message received: ${message.messageId} type=${message.data['type']}',
  );

  // Handle background notification silently (no UI)
  // The notification will be shown automatically by the OS for data messages
}

/// Background local notification callback — must be a top-level function.
@pragma('vm:entry-point')
void _onBackgroundLocalNotificationTapped(NotificationResponse response) {
  debugPrint(
    '[NotificationService] Background local notification tapped: ${response.payload}',
  );
}
