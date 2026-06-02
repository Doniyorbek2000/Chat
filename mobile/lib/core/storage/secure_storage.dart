import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorageService {
  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(
      accessibility: KeychainAccessibility.first_unlock_this_device,
    ),
  );

  static const String _accessTokenKey = 'access_token';
  static const String _refreshTokenKey = 'refresh_token';
  static const String _userIdKey = 'user_id';
  static const String _pinKey = 'wallet_pin';
  static const String _biometricKey = 'biometric_enabled';

  // Access Token
  static Future<void> saveAccessToken(String token) async {
    await _storage.write(key: _accessTokenKey, value: token);
  }

  static Future<String?> getAccessToken() async {
    return await _storage.read(key: _accessTokenKey);
  }

  static Future<void> deleteAccessToken() async {
    await _storage.delete(key: _accessTokenKey);
  }

  // Refresh Token
  static Future<void> saveRefreshToken(String token) async {
    await _storage.write(key: _refreshTokenKey, value: token);
  }

  static Future<String?> getRefreshToken() async {
    return await _storage.read(key: _refreshTokenKey);
  }

  static Future<void> deleteRefreshToken() async {
    await _storage.delete(key: _refreshTokenKey);
  }

  // User ID
  static Future<void> saveUserId(String userId) async {
    await _storage.write(key: _userIdKey, value: userId);
  }

  static Future<String?> getUserId() async {
    return await _storage.read(key: _userIdKey);
  }

  // Wallet PIN
  static Future<void> saveWalletPin(String pin) async {
    await _storage.write(key: _pinKey, value: pin);
  }

  static Future<String?> getWalletPin() async {
    return await _storage.read(key: _pinKey);
  }

  static Future<void> deleteWalletPin() async {
    await _storage.delete(key: _pinKey);
  }

  // Biometric
  static Future<void> setBiometricEnabled(bool enabled) async {
    await _storage.write(
        key: _biometricKey, value: enabled.toString());
  }

  static Future<bool> isBiometricEnabled() async {
    final value = await _storage.read(key: _biometricKey);
    return value == 'true';
  }

  // Save all auth data at once
  static Future<void> saveAuthData({
    required String accessToken,
    required String refreshToken,
    required String userId,
  }) async {
    await Future.wait([
      saveAccessToken(accessToken),
      saveRefreshToken(refreshToken),
      saveUserId(userId),
    ]);
  }

  // Clear all auth data on logout
  static Future<void> clearAuthData() async {
    await Future.wait([
      deleteAccessToken(),
      deleteRefreshToken(),
      _storage.delete(key: _userIdKey),
    ]);
  }

  // Clear everything
  static Future<void> clearAll() async {
    await _storage.deleteAll();
  }
}
