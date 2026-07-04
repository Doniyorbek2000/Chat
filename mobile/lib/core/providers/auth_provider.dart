import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/user_model.dart';
import '../network/api_client.dart';
import '../network/socket_client.dart';
import '../storage/secure_storage.dart';
import '../storage/local_storage.dart';
import '../constants/api_constants.dart';
import '../services/notification_service.dart';

enum AuthStatus { initial, loading, authenticated, unauthenticated, error }

class AuthState {
  final AuthStatus status;
  final UserModel? user;
  final String? error;

  const AuthState({
    required this.status,
    this.user,
    this.error,
  });

  AuthState copyWith({
    AuthStatus? status,
    UserModel? user,
    String? error,
  }) {
    return AuthState(
      status: status ?? this.status,
      user: user ?? this.user,
      error: error ?? this.error,
    );
  }

  bool get isAuthenticated => status == AuthStatus.authenticated;
  bool get isLoading => status == AuthStatus.loading;
  bool get isLoggedIn => user != null && status == AuthStatus.authenticated;
}

class AuthNotifier extends StateNotifier<AuthState> {
  final ApiClient _apiClient;

  AuthNotifier(this._apiClient)
      : super(const AuthState(status: AuthStatus.initial));

  Future<void> checkAuthStatus() async {
    state = const AuthState(status: AuthStatus.loading);
    try {
      final token = await SecureStorageService.getAccessToken();
      if (token == null) {
        state = const AuthState(status: AuthStatus.unauthenticated);
        return;
      }

      // Try to get user from cache first
      final cachedUserData = LocalStorageService.getUserData();
      if (cachedUserData != null) {
        final user = UserModel.fromJson(cachedUserData);
        state = AuthState(status: AuthStatus.authenticated, user: user);
      }

      // Refresh user data from API
      await refreshUserData();
    } catch (e) {
      state = const AuthState(status: AuthStatus.unauthenticated);
    }
  }

  Future<void> refreshUserData() async {
    try {
      final response = await _apiClient.get(ApiConstants.me);
      final user = UserModel.fromJson(response.data as Map<String, dynamic>);
      await LocalStorageService.saveUserData(user.toJson());
      state = AuthState(status: AuthStatus.authenticated, user: user);

      // Connect socket after authentication
      await SocketClient.instance.connect();
    } catch (e) {
      if (state.user == null) {
        state = const AuthState(status: AuthStatus.unauthenticated);
      }
    }
  }

  Future<bool> sendOtp(String phoneNumber, String countryCode) async {
    try {
      state = state.copyWith(status: AuthStatus.loading);
      await _apiClient.post(
        ApiConstants.sendOtp,
        data: {
          'phone': phoneNumber,
          'countryCode': countryCode,
        },
      );
      state = state.copyWith(status: AuthStatus.unauthenticated);
      return true;
    } catch (e) {
      state = state.copyWith(
        status: AuthStatus.error,
        error: e.toString(),
      );
      return false;
    }
  }

  Future<bool> verifyOtp({
    required String phone,
    required String countryCode,
    required String otp,
  }) async {
    try {
      state = state.copyWith(status: AuthStatus.loading);
      final response = await _apiClient.post(
        ApiConstants.verifyOtp,
        data: {
          'phone': phone,
          'countryCode': countryCode,
          'otp': otp,
        },
      );

      final data = response.data as Map<String, dynamic>;
      final accessToken = data['accessToken'] as String;
      final refreshToken = data['refreshToken'] as String;
      final userData = data['user'] as Map<String, dynamic>;
      final user = UserModel.fromJson(userData);

      await SecureStorageService.saveAuthData(
        accessToken: accessToken,
        refreshToken: refreshToken,
        userId: user.id,
      );
      await LocalStorageService.saveUserData(user.toJson());

      state = AuthState(status: AuthStatus.authenticated, user: user);
      await SocketClient.instance.connect();

      return true;
    } catch (e) {
      state = state.copyWith(
        status: AuthStatus.error,
        error: e.toString(),
      );
      return false;
    }
  }

  Future<bool> loginWithGoogle(String idToken) async {
    try {
      state = state.copyWith(status: AuthStatus.loading);
      final response = await _apiClient.post(
        ApiConstants.googleLogin,
        data: {'idToken': idToken},
      );

      final data = response.data as Map<String, dynamic>;
      await _handleAuthResponse(data);
      return true;
    } catch (e) {
      state = state.copyWith(
        status: AuthStatus.error,
        error: e.toString(),
      );
      return false;
    }
  }

  Future<bool> loginWithApple({
    required String identityToken,
    String? firstName,
    String? lastName,
  }) async {
    try {
      state = state.copyWith(status: AuthStatus.loading);
      final response = await _apiClient.post(
        ApiConstants.appleLogin,
        data: {
          'identityToken': identityToken,
          if (firstName != null) 'firstName': firstName,
          if (lastName != null) 'lastName': lastName,
        },
      );

      final data = response.data as Map<String, dynamic>;
      await _handleAuthResponse(data);
      return true;
    } catch (e) {
      state = state.copyWith(
        status: AuthStatus.error,
        error: e.toString(),
      );
      return false;
    }
  }

  Future<bool> loginAsGuest() async {
    try {
      state = state.copyWith(status: AuthStatus.loading);
      final response = await _apiClient.post(ApiConstants.guestLogin);
      final data = response.data as Map<String, dynamic>;
      await _handleAuthResponse(data);
      return true;
    } catch (e) {
      state = state.copyWith(
        status: AuthStatus.error,
        error: e.toString(),
      );
      return false;
    }
  }

  Future<void> _handleAuthResponse(Map<String, dynamic> data) async {
    final accessToken = data['accessToken'] as String;
    final refreshToken = data['refreshToken'] as String;
    final userData = data['user'] as Map<String, dynamic>;
    final user = UserModel.fromJson(userData);

    await SecureStorageService.saveAuthData(
      accessToken: accessToken,
      refreshToken: refreshToken,
      userId: user.id,
    );
    await LocalStorageService.saveUserData(user.toJson());

    state = AuthState(status: AuthStatus.authenticated, user: user);
    await SocketClient.instance.connect();

    // Register this device for push notifications (non-blocking)
    NotificationService().syncTokenToBackend();
  }

  Future<bool> setupProfile({
    required String username,
    required String displayName,
    required String gender,
    String? birthday,
    String? avatarPath,
  }) async {
    try {
      state = state.copyWith(status: AuthStatus.loading);
      final response = await _apiClient.put(
        ApiConstants.updateProfile,
        data: {
          'username': username,
          'displayName': displayName,
          'gender': gender,
          if (birthday != null) 'birthday': birthday,
        },
      );

      final user = UserModel.fromJson(response.data as Map<String, dynamic>);
      await LocalStorageService.saveUserData(user.toJson());
      state = AuthState(status: AuthStatus.authenticated, user: user);

      if (avatarPath != null) {
        await updateAvatar(avatarPath);
      }

      return true;
    } catch (e) {
      state = state.copyWith(
        status: AuthStatus.error,
        error: e.toString(),
      );
      return false;
    }
  }

  Future<bool> updateAvatar(String imagePath) async {
    try {
      final formData = {
        'avatar': await _createMultipartFile(imagePath),
      };

      // Since we can't directly use dio FormData here simply, we delegate
      final response = await _apiClient.patch(
        ApiConstants.updateAvatar,
        data: formData,
      );

      final user = UserModel.fromJson(response.data as Map<String, dynamic>);
      await LocalStorageService.saveUserData(user.toJson());
      state = state.copyWith(user: user);
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<dynamic> _createMultipartFile(String path) async {
    return path; // In real app: MultipartFile.fromFile(path)
  }

  void updateUserInState(UserModel user) {
    state = state.copyWith(user: user);
    LocalStorageService.saveUserData(user.toJson());
  }

  Future<void> logout() async {
    try {
      await _apiClient.post(ApiConstants.logout);
    } catch (_) {}

    SocketClient.instance.disconnect();
    await SecureStorageService.clearAuthData();
    await LocalStorageService.clearAll();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }
}

// Providers
final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient.instance;
});

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return AuthNotifier(apiClient);
});

final currentUserProvider = Provider<UserModel?>((ref) {
  return ref.watch(authProvider).user;
});

final isLoggedInProvider = Provider<bool>((ref) {
  return ref.watch(authProvider).isLoggedIn;
});
