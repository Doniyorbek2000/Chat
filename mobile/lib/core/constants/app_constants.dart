class AppConstants {
  AppConstants._();

  static const String appName = 'VOXO';
  static const String appVersion = '1.0.0';
  static const String appBuildNumber = '1';

  // Hive Box Names
  static const String userBox = 'user_box';
  static const String settingsBox = 'settings_box';
  static const String cacheBox = 'cache_box';

  // Hive Keys
  static const String userKey = 'current_user';
  static const String themeKey = 'theme_mode';
  static const String languageKey = 'language';
  static const String onboardingKey = 'onboarding_shown';
  static const String fcmTokenKey = 'fcm_token';

  // Room Constants
  static const List<int> seatOptions = [8, 12, 16];
  static const int defaultMaxSeats = 8;
  static const int maxRoomMessages = 500;
  static const int giftAnimationDurationMs = 3000;
  static const int entryEffectDurationMs = 2000;

  // Pagination
  static const int defaultPageSize = 20;
  static const int roomsPageSize = 20;
  static const int messagesPageSize = 30;

  // VIP Levels
  static const int maxVipLevel = 10;
  static const List<int> vipRequirements = [
    0, 1000, 5000, 15000, 40000, 100000, 250000, 500000, 1000000, 2000000
  ];

  // Gift
  static const List<int> giftSendCounts = [1, 10, 99];
  static const int maxGiftQueueSize = 5;

  // Wallet
  static const int minRechargeAmount = 1000; // in coins
  static const int maxTransferAmount = 100000;
  static const int minWithdrawAmount = 5000;

  // PK Battle
  static const int pkBattleDurationMinutes = 10;
  static const int pkBattleExtendMinutes = 5;

  // Media
  static const int maxImageSizeMB = 10;
  static const int maxVoiceMessageSeconds = 60;
  static const int avatarMaxSizeKB = 500;

  // Animation durations
  static const Duration shortAnimation = Duration(milliseconds: 200);
  static const Duration mediumAnimation = Duration(milliseconds: 400);
  static const Duration longAnimation = Duration(milliseconds: 800);

  // Cache durations
  static const Duration shortCache = Duration(minutes: 5);
  static const Duration mediumCache = Duration(minutes: 30);
  static const Duration longCache = Duration(hours: 24);

  // Social
  static const int maxUsernameLength = 20;
  static const int minUsernameLength = 3;
  static const int maxBioLength = 150;
  static const int maxRoomTitleLength = 30;
  static const int maxRoomDescLength = 200;

  // Languages
  static const List<Map<String, String>> supportedLanguages = [
    {'code': 'en', 'name': 'English'},
    {'code': 'uz', 'name': "O'zbek"},
    {'code': 'ru', 'name': 'Русский'},
    {'code': 'ar', 'name': 'العربية'},
  ];
}
