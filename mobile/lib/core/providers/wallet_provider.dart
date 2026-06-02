import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/wallet_model.dart';
import '../network/api_client.dart';
import '../constants/api_constants.dart';
import 'auth_provider.dart';

class WalletNotifier extends StateNotifier<AsyncValue<WalletModel>> {
  final ApiClient _apiClient;
  final Ref _ref;

  WalletNotifier(this._apiClient, this._ref)
      : super(const AsyncValue.loading());

  Future<void> loadWallet() async {
    state = const AsyncValue.loading();
    try {
      final response = await _apiClient.get(ApiConstants.wallet);
      final wallet =
          WalletModel.fromJson(response.data as Map<String, dynamic>);
      state = AsyncValue.data(wallet);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> refreshBalance() async {
    try {
      final response = await _apiClient.get(ApiConstants.wallet);
      final wallet =
          WalletModel.fromJson(response.data as Map<String, dynamic>);
      state = AsyncValue.data(wallet);

      // Update coins in user state too
      final currentUser = _ref.read(currentUserProvider);
      if (currentUser != null) {
        final updatedUser = currentUser.copyWith(
          coins: wallet.coins,
          diamonds: wallet.diamonds,
        );
        _ref.read(authProvider.notifier).updateUserInState(updatedUser);
      }
    } catch (_) {}
  }

  Future<List<TransactionModel>> getTransactions({
    int page = 1,
    int limit = 20,
    String? type,
  }) async {
    try {
      final response = await _apiClient.get(
        ApiConstants.transactions,
        queryParameters: {
          'page': page,
          'limit': limit,
          if (type != null) 'type': type,
        },
      );
      final data = response.data as Map<String, dynamic>;
      final items = data['items'] as List;
      return items
          .map((e) => TransactionModel.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (e) {
      return [];
    }
  }

  Future<String?> recharge({
    required String packageId,
    required String paymentMethod,
  }) async {
    try {
      final response = await _apiClient.post(
        ApiConstants.recharge,
        data: {
          'packageId': packageId,
          'paymentMethod': paymentMethod,
        },
      );
      final data = response.data as Map<String, dynamic>;
      return data['paymentUrl'] as String?;
    } catch (e) {
      return null;
    }
  }

  Future<bool> transfer({
    required String toUserId,
    required int amount,
    String? message,
  }) async {
    try {
      await _apiClient.post(
        ApiConstants.transfer,
        data: {
          'toUserId': toUserId,
          'amount': amount,
          if (message != null) 'message': message,
        },
      );
      await refreshBalance();
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> requestWithdraw({
    required int amount,
    required String method,
    required String accountInfo,
  }) async {
    try {
      await _apiClient.post(
        ApiConstants.withdraw,
        data: {
          'amount': amount,
          'method': method,
          'accountInfo': accountInfo,
        },
      );
      await refreshBalance();
      return true;
    } catch (e) {
      return false;
    }
  }

  void deductCoins(int amount) {
    state.whenData((wallet) {
      state = AsyncValue.data(
        wallet.copyWith(coins: (wallet.coins - amount).clamp(0, wallet.coins)),
      );

      final currentUser = _ref.read(currentUserProvider);
      if (currentUser != null) {
        _ref.read(authProvider.notifier).updateUserInState(
              currentUser.copyWith(
                coins: (currentUser.coins - amount).clamp(0, currentUser.coins),
              ),
            );
      }
    });
  }

  void addCoins(int amount) {
    state.whenData((wallet) {
      state = AsyncValue.data(
        wallet.copyWith(coins: wallet.coins + amount),
      );
    });
  }
}

final walletProvider =
    StateNotifierProvider<WalletNotifier, AsyncValue<WalletModel>>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return WalletNotifier(apiClient, ref);
});

final walletBalanceProvider = Provider<int>((ref) {
  final wallet = ref.watch(walletProvider);
  return wallet.whenOrNull(data: (w) => w.coins) ?? 0;
});

final diamondBalanceProvider = Provider<int>((ref) {
  final wallet = ref.watch(walletProvider);
  return wallet.whenOrNull(data: (w) => w.diamonds) ?? 0;
});
