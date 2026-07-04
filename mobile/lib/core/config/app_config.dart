import 'package:flutter/foundation.dart';

class AppConfig {
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3000/api/v1',
  );

  static const String socketUrl = String.fromEnvironment(
    'SOCKET_URL',
    defaultValue: 'http://localhost:3000',
  );

  static const String environment = String.fromEnvironment(
    'ENVIRONMENT',
    defaultValue: 'development',
  );

  /// ZEGOCLOUD App ID. Pass at build time:
  /// flutter run --dart-define=ZEGO_APP_ID=123456789
  static const int zegoAppId = int.fromEnvironment('ZEGO_APP_ID');

  static bool get isVoiceConfigured => zegoAppId != 0;

  static bool get isProduction => environment == 'production';
  static bool get isDevelopment => environment == 'development';
}
