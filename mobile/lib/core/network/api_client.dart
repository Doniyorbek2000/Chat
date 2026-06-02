import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../constants/api_constants.dart';
import '../storage/secure_storage.dart';

class ApiClient {
  static ApiClient? _instance;
  late final Dio _dio;

  ApiClient._() {
    _dio = Dio(
      BaseOptions(
        baseUrl: ApiConstants.baseUrl,
        connectTimeout: ApiConstants.connectTimeout,
        receiveTimeout: ApiConstants.receiveTimeout,
        sendTimeout: ApiConstants.sendTimeout,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      ),
    );

    _dio.interceptors.addAll([
      _AuthInterceptor(_dio),
      if (kDebugMode) _LogInterceptor(),
      _ErrorInterceptor(),
    ]);
  }

  static ApiClient get instance {
    _instance ??= ApiClient._();
    return _instance!;
  }

  Dio get dio => _dio;

  // Generic GET request
  Future<Response<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    return await _dio.get<T>(
      path,
      queryParameters: queryParameters,
      options: options,
    );
  }

  // Generic POST request
  Future<Response<T>> post<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    return await _dio.post<T>(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
    );
  }

  // Generic PUT request
  Future<Response<T>> put<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    return await _dio.put<T>(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
    );
  }

  // Generic PATCH request
  Future<Response<T>> patch<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    return await _dio.patch<T>(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
    );
  }

  // Generic DELETE request
  Future<Response<T>> delete<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    return await _dio.delete<T>(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
    );
  }

  // Upload file
  Future<Response<T>> uploadFile<T>(
    String path,
    FormData formData, {
    ProgressCallback? onSendProgress,
  }) async {
    return await _dio.post<T>(
      path,
      data: formData,
      onSendProgress: onSendProgress,
      options: Options(
        headers: {'Content-Type': 'multipart/form-data'},
      ),
    );
  }
}

class _AuthInterceptor extends Interceptor {
  final Dio _dio;
  bool _isRefreshing = false;
  final List<RequestOptions> _pendingRequests = [];

  _AuthInterceptor(this._dio);

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await SecureStorageService.getAccessToken();
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    if (err.response?.statusCode == 401) {
      if (_isRefreshing) {
        _pendingRequests.add(err.requestOptions);
        return;
      }

      _isRefreshing = true;

      try {
        final refreshToken = await SecureStorageService.getRefreshToken();
        if (refreshToken == null) {
          await SecureStorageService.clearAuthData();
          handler.next(err);
          return;
        }

        final response = await _dio.post(
          ApiConstants.refresh,
          data: {'refreshToken': refreshToken},
          options: Options(
            headers: {'Authorization': null},
          ),
        );

        final newAccessToken = response.data['accessToken'] as String;
        final newRefreshToken = response.data['refreshToken'] as String?;

        await SecureStorageService.saveAccessToken(newAccessToken);
        if (newRefreshToken != null) {
          await SecureStorageService.saveRefreshToken(newRefreshToken);
        }

        // Retry original request with new token
        err.requestOptions.headers['Authorization'] = 'Bearer $newAccessToken';
        final retryResponse = await _dio.fetch(err.requestOptions);

        // Retry pending requests
        for (final pendingRequest in _pendingRequests) {
          pendingRequest.headers['Authorization'] = 'Bearer $newAccessToken';
          _dio.fetch(pendingRequest);
        }
        _pendingRequests.clear();
        _isRefreshing = false;

        handler.resolve(retryResponse);
      } catch (e) {
        _isRefreshing = false;
        _pendingRequests.clear();
        await SecureStorageService.clearAuthData();
        handler.next(err);
      }
    } else {
      handler.next(err);
    }
  }
}

class _LogInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    debugPrint('REQUEST[${options.method}] => PATH: ${options.path}');
    debugPrint('HEADERS: ${options.headers}');
    if (options.data != null) debugPrint('DATA: ${options.data}');
    handler.next(options);
  }

  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) {
    debugPrint(
        'RESPONSE[${response.statusCode}] => PATH: ${response.requestOptions.path}');
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    debugPrint(
        'ERROR[${err.response?.statusCode}] => PATH: ${err.requestOptions.path}');
    debugPrint('ERROR MESSAGE: ${err.message}');
    handler.next(err);
  }
}

class _ErrorInterceptor extends Interceptor {
  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    final message = _getErrorMessage(err);
    final appError = DioException(
      requestOptions: err.requestOptions,
      response: err.response,
      type: err.type,
      error: message,
    );
    handler.next(appError);
  }

  String _getErrorMessage(DioException err) {
    if (err.response?.data is Map) {
      final data = err.response!.data as Map;
      return data['message'] as String? ?? _getDefaultMessage(err);
    }

    switch (err.type) {
      case DioExceptionType.connectionTimeout:
        return 'Connection timed out. Please try again.';
      case DioExceptionType.receiveTimeout:
        return 'Server is taking too long. Please try again.';
      case DioExceptionType.sendTimeout:
        return 'Request timed out. Please try again.';
      case DioExceptionType.connectionError:
        return 'No internet connection. Please check your network.';
      case DioExceptionType.badResponse:
        return _getDefaultMessage(err);
      default:
        return 'Something went wrong. Please try again.';
    }
  }

  String _getDefaultMessage(DioException err) {
    switch (err.response?.statusCode) {
      case 400:
        return 'Invalid request. Please check your input.';
      case 401:
        return 'Session expired. Please login again.';
      case 403:
        return 'You don\'t have permission to do this.';
      case 404:
        return 'Resource not found.';
      case 422:
        return 'Validation failed. Please check your input.';
      case 429:
        return 'Too many requests. Please slow down.';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return 'Something went wrong. Please try again.';
    }
  }
}
