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

      final data = unwrapResponse(response.data);
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

  Future<bool> loginWithFacebook(String accessToken) async {
    try {
      state = state.copyWith(status: AuthStatus.loading);
      final response = await _apiClient.post(
        ApiConstants.facebookLogin,
        data: {'accessToken': accessToken},
      );

      await _handleAuthResponse(response.data as Map<String, dynamic>);
      return true;
    } catch (e) {
      state = state.copyWith(
        status: AuthStatus.error,
        error: e.toString(),
      );
      return false;
    }
  }

  /// Returns 'ok' when logged in, 'verify' when an email code is required,
  /// or null on failure (see state.error).
  Future<String?> registerWithEmail({
    required String email,
    required String password,
    String? displayName,
  }) async {
    try {
      state = state.copyWith(status: AuthStatus.loading);
      final response = await _apiClient.post(
        ApiConstants.emailRegister,
        data: {
          'email': email,
          'password': password,
          if (displayName != null && displayName.isNotEmpty)
            'displayName': displayName,
        },
      );

      final data = unwrapResponse(response.data);
      if (data['requiresVerification'] == true) {
        state = state.copyWith(status: AuthStatus.unauthenticated);
        return 'verify';
      }

      await _handleAuthResponse(data);
      return 'ok';
    } catch (e) {
      state = state.copyWith(
        status: AuthStatus.error,
        error: e.toString(),
      );
      return null;
    }
  }

  /// Returns 'ok' when logged in, 'verify' when the email still needs a
  /// verification code, or null on failure (see state.error).
  Future<String?> loginWithEmail({
    required String email,
    required String password,
  }) async {
    try {
      state = state.copyWith(status: AuthStatus.loading);
      final response = await _apiClient.post(
        ApiConstants.emailLogin,
        data: {'email': email, 'password': password},
      );

      await _handleAuthResponse(response.data as Map<String, dynamic>);
      return 'ok';
    } catch (e) {
      final message = e.toString();
      if (message.contains('not verified')) {
        state = state.copyWith(status: AuthStatus.unauthenticated);
        return 'verify';
      }
      state = state.copyWith(
        status: AuthStatus.error,
        error: message,
      );
      return null;
    }
  }

  Future<bool> verifyEmail({
    required String email,
    required String code,
  }) async {
    try {
      state = state.copyWith(status: AuthStatus.loading);
      final response = await _apiClient.post(
        ApiConstants.emailVerify,
        data: {'email': email, 'code': code},
      );

      await _handleAuthResponse(response.data as Map<String, dynamic>);
      return true;
    } catch (e) {
      state = state.copyWith(
        status: AuthStatus.error,
        error: e.toString(),
      );
      return false;
    }
  }

  Future<void> resendEmailCode(String email) async {
    try {
      await _apiClient.post(
        ApiConstants.emailResend,
        data: {'email': email},
      );
    } catch (_) {}
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

  /// Strip the backend's global `{ success, data }` response envelope.
  static Map<String, dynamic> unwrapResponse(dynamic body) {
    if (body is Map && body['data'] is Map) {
      return Map<String, dynamic>.from(body['data'] as Map);
    }
    return Map<String, dynamic>.from(body as Map);
  }

  Future<void> _handleAuthResponse(Map<String, dynamic> raw) async {
    final data = unwrapResponse(raw);
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
