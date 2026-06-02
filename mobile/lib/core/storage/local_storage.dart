import 'package:hive_flutter/hive_flutter.dart';
import '../constants/app_constants.dart';

class LocalStorageService {
  LocalStorageService._();

  static late Box _settingsBox;
  static late Box _cacheBox;

  static Future<void> init() async {
    await Hive.initFlutter();
    _settingsBox = await Hive.openBox(AppConstants.settingsBox);
    _cacheBox = await Hive.openBox(AppConstants.cacheBox);
  }

  // Settings
  static Future<void> saveSetting(String key, dynamic value) async {
    await _settingsBox.put(key, value);
  }

  static T? getSetting<T>(String key, {T? defaultValue}) {
    return _settingsBox.get(key, defaultValue: defaultValue) as T?;
  }

  static Future<void> deleteSetting(String key) async {
    await _settingsBox.delete(key);
  }

  // Theme
  static Future<void> saveThemeMode(String mode) async {
    await saveSetting(AppConstants.themeKey, mode);
  }

  static String getThemeMode() {
    return getSetting<String>(AppConstants.themeKey,
        defaultValue: 'dark') ?? 'dark';
  }

  // Language
  static Future<void> saveLanguage(String languageCode) async {
    await saveSetting(AppConstants.languageKey, languageCode);
  }

  static String getLanguage() {
    return getSetting<String>(AppConstants.languageKey,
        defaultValue: 'en') ?? 'en';
  }

  // Onboarding
  static Future<void> setOnboardingShown() async {
    await saveSetting(AppConstants.onboardingKey, true);
  }

  static bool isOnboardingShown() {
    return getSetting<bool>(AppConstants.onboardingKey,
        defaultValue: false) ?? false;
  }

  // FCM Token
  static Future<void> saveFcmToken(String token) async {
    await saveSetting(AppConstants.fcmTokenKey, token);
  }

  static String? getFcmToken() {
    return getSetting<String>(AppConstants.fcmTokenKey);
  }

  // Cache with expiry
  static Future<void> saveCache(String key, dynamic value,
      {Duration? expiry}) async {
    final cacheEntry = {
      'value': value,
      'expiry': expiry != null
          ? DateTime.now().add(expiry).millisecondsSinceEpoch
          : null,
    };
    await _cacheBox.put(key, cacheEntry);
  }

  static T? getCache<T>(String key) {
    final entry = _cacheBox.get(key) as Map?;
    if (entry == null) return null;
    final expiry = entry['expiry'] as int?;
    if (expiry != null && DateTime.now().millisecondsSinceEpoch > expiry) {
      _cacheBox.delete(key);
      return null;
    }
    return entry['value'] as T?;
  }

  static Future<void> deleteCache(String key) async {
    await _cacheBox.delete(key);
  }

  static Future<void> clearCache() async {
    await _cacheBox.clear();
  }

  // User data cache
  static Future<void> saveUserData(Map<String, dynamic> userData) async {
    await saveCache(AppConstants.userKey, userData,
        expiry: AppConstants.shortCache);
  }

  static Map<String, dynamic>? getUserData() {
    return getCache<Map<String, dynamic>>(AppConstants.userKey);
  }

  // Notification settings
  static Future<void> saveNotificationSettings(
      Map<String, bool> settings) async {
    await saveSetting('notification_settings', settings);
  }

  static Map<String, bool> getNotificationSettings() {
    final data = getSetting<Map>('notification_settings');
    if (data == null) {
      return {
        'gifts': true,
        'follows': true,
        'messages': true,
        'system': true,
        'pk': true,
        'family': true,
        'couple': true,
      };
    }
    return data.cast<String, bool>();
  }

  // Privacy settings
  static Future<void> savePrivacySettings(
      Map<String, dynamic> settings) async {
    await saveSetting('privacy_settings', settings);
  }

  static Map<String, dynamic> getPrivacySettings() {
    final data = getSetting<Map>('privacy_settings');
    if (data == null) {
      return {
        'profileVisibility': 'everyone',
        'allowMessages': 'everyone',
        'showOnlineStatus': true,
        'showLocation': false,
      };
    }
    return data.cast<String, dynamic>();
  }

  static Future<void> clearAll() async {
    await Future.wait([
      _settingsBox.clear(),
      _cacheBox.clear(),
    ]);
  }
}
