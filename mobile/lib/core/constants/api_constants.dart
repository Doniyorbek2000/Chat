class ApiConstants {
  ApiConstants._();

  static const String baseUrl = 'https://api.voxo.live/api/v1';
  static const String wsUrl = 'wss://api.voxo.live';
  static const String cdnUrl = 'https://cdn.voxo.live';

  static const Duration connectTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);
  static const Duration sendTimeout = Duration(seconds: 60);

  // Auth
  static const String login = '/auth/login';
  static const String sendOtp = '/auth/send-otp';
  static const String verifyOtp = '/auth/verify-otp';
  static const String refresh = '/auth/refresh';
  static const String logout = '/auth/logout';
  static const String googleLogin = '/auth/google';
  static const String appleLogin = '/auth/apple';
  static const String facebookLogin = '/auth/facebook';
  static const String telegramLogin = '/auth/telegram';
  static const String emailRegister = '/auth/email/register';
  static const String emailLogin = '/auth/email/login';
  static const String emailVerify = '/auth/email/verify';
  static const String emailResend = '/auth/email/resend';
  static const String guestLogin = '/auth/guest';

  // Users
  static const String users = '/users';
  static const String me = '/users/me';
  static const String updateProfile = '/users/me';
  static const String updateAvatar = '/users/me/avatar';
  static const String updateFcmToken = '/users/me/fcm-token';
  static const String follow = '/users/{uid}/follow';
  static const String unfollow = '/users/{uid}/unfollow';
  static const String followers = '/users/{uid}/followers';
  static const String following = '/users/{uid}/following';
  static const String blockUser = '/users/{uid}/block';
  static const String userProfile = '/users/{uid}';

  // Rooms
  static const String rooms = '/rooms';
  static const String featuredRooms = '/rooms/featured';
  static const String liveRooms = '/rooms/live';
  static const String roomById = '/rooms/{id}';
  static const String createRoom = '/rooms';
  static const String joinRoom = '/rooms/{id}/join';
  static const String zegoToken = '/rooms/{id}/zego-token';
  static const String leaveRoom = '/rooms/{id}/leave';
  static const String roomSeats = '/rooms/{id}/seats';
  static const String takeSeat = '/rooms/{id}/seats/{seatIndex}/take';
  static const String leaveSeat = '/rooms/{id}/seats/{seatIndex}/leave';
  static const String kickFromSeat = '/rooms/{id}/seats/{seatIndex}/kick';
  static const String lockSeat = '/rooms/{id}/seats/{seatIndex}/lock';
  static const String muteUser = '/rooms/{id}/mute/{uid}';
  static const String kickFromRoom = '/rooms/{id}/kick/{uid}';
  static const String closeRoom = '/rooms/{id}/close';

  // PK Battle
  static const String startPk = '/rooms/{id}/pk/start';
  static const String endPk = '/rooms/{id}/pk/end';
  static const String pkStatus = '/rooms/{id}/pk/status';

  // Gifts
  static const String gifts = '/gifts';
  static const String giftCategories = '/gifts/categories';
  static const String sendGift = '/gifts/send';
  static const String giftHistory = '/gifts/history';

  // Wallet
  static const String wallet = '/wallet/me';
  static const String walletBalance = '/wallet/balance';
  static const String transactions = '/wallet/transactions';
  static const String transfer = '/wallet/transfer';
  static const String withdraw = '/wallet/withdraw';
  static const String withdrawRequests = '/wallet/withdraw-requests';
  static const String paymentMethods = '/wallet/payment-methods';
  static const String rechargeProducts = '/wallet/recharge-products';
  static const String firstRechargeOffer = '/wallet/first-recharge-offer';
  static const String dailyRecharge = '/wallet/daily-recharge';
  static const String claimDailyRecharge = '/wallet/daily-recharge/claim';

  // Payments
  static const String initiatePayment = '/payments/initiate';
  static const String recharge = '/payments/initiate';
  static const String paymentHistory = '/payments/history';
  static const String googlePlayVerify = '/payments/google-play/verify';

  // VIP
  static const String vipPackages = '/vip/packages';
  static const String purchaseVip = '/vip/purchase';
  static const String vipStatus = '/vip/status';

  // Leaderboard
  static const String leaderboard = '/leaderboard';
  static const String topUsers = '/leaderboard/users';
  static const String topRooms = '/leaderboard/rooms';
  static const String topFamilies = '/leaderboard/families';
  static const String topCouples = '/leaderboard/couples';

  // Family
  static const String families = '/families';
  static const String familyById = '/families/{id}';
  static const String createFamily = '/families';
  static const String joinFamily = '/families/{id}/join';
  static const String leaveFamily = '/families/{id}/leave';
  static const String familyMembers = '/families/{id}/members';
  static const String familyTreasury = '/families/{id}/treasury';
  static const String donateToFamily = '/families/{id}/donate';

  // Couple
  static const String couples = '/couples';
  static const String coupleRequest = '/couples/request';
  static const String acceptCouple = '/couples/accept';
  static const String breakupCouple = '/couples/breakup';

  // Messages
  static const String conversations = '/messages/conversations';
  static const String messages = '/messages/{userId}';
  static const String sendMessage = '/messages/{userId}';
  static const String markRead = '/messages/{userId}/read';
  static const String deleteMessage = '/messages/{messageId}';

  // Notifications
  static const String notifications = '/notifications';
  static const String markNotificationRead = '/notifications/{id}/read';
  static const String markAllRead = '/notifications/read-all';
  static const String notificationSettings = '/notifications/settings';
  static const String registerFcm = '/notifications/fcm';

  // Agency
  static const String agency = '/agency';
  static const String agencyStats = '/agency/stats';
  static const String agencyHosts = '/agency/hosts';
  static const String agencyEarnings = '/agency/earnings';
  static const String agencyApplications = '/agency/applications';

  // Search
  static const String search = '/search';
  static const String searchUsers = '/search/users';
  static const String searchRooms = '/search/rooms';

  // Settings
  static const String settings = '/settings';
  static const String privacySettings = '/settings/privacy';
  static const String notificationSettings2 = '/settings/notifications';
  static const String settingsMe = '/settings/me';
  static const String settingsBlocked = '/settings/blocked';
  static const String settingsDeletionRequest = '/settings/deletion-request';
  static const String settingsLogsUpload = '/settings/logs/upload';
  static const String settingsLinkedAccounts = '/settings/linked-accounts';
  static const String changePassword = '/auth/change-password';

  // Support
  static const String supportTickets = '/support/tickets';
  static const String supportPolicies = '/support/policies';

  // Reports
  static const String reportUser = '/reports/user';
  static const String reportRoom = '/reports/room';

  // Noble
  static const String noblePlans = '/noble/plans';
  static const String nobleMe = '/noble/me';
  static const String noblePurchase = '/noble/purchase';
  static const String nobleSend = '/noble/send';
  static const String nobleCancel = '/noble/cancel';
  static const String nobleHistory = '/noble/history';

  // Shop
  static const String shopItems = '/shop/items';
  static const String shopMyItems = '/shop/items/mine';
  static const String shopBuyItem = '/shop/items/{id}/buy';
  static const String shopEquipItem = '/shop/items/{id}/equip';
  static const String shopUnequipItem = '/shop/items/{id}/equip';

  // Socket Events
  static const String socketRoom = 'room';
  static const String socketChat = 'chat';
  static const String socketGift = 'gift';
  static const String socketPk = 'pk';
  static const String socketSystem = 'system';
}
