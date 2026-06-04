import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../network/api_client.dart';
import '../constants/api_constants.dart';
import 'auth_provider.dart';

// ---------------------------------------------------------------------------
// Gift model
// ---------------------------------------------------------------------------

class GiftModel {
  final String id;
  final String name;
  final String category;
  final String type;
  final String imageUrl;
  final String? animationUrl;
  final int coinPrice;
  final int diamondPrice;
  final bool isActive;
  final int sortOrder;

  const GiftModel({
    required this.id,
    required this.name,
    required this.category,
    required this.type,
    required this.imageUrl,
    this.animationUrl,
    required this.coinPrice,
    required this.diamondPrice,
    required this.isActive,
    required this.sortOrder,
  });

  factory GiftModel.fromJson(Map<String, dynamic> json) => GiftModel(
        id: json['id'] as String,
        name: json['name'] as String,
        category: (json['category'] as String?) ?? 'NORMAL',
        type: (json['type'] as String?) ?? 'STATIC',
        imageUrl: (json['imageUrl'] as String?) ?? '',
        animationUrl: json['animationUrl'] as String?,
        coinPrice: (json['coinPrice'] as num?)?.toInt() ?? 0,
        diamondPrice: (json['diamondPrice'] as num?)?.toInt() ?? 0,
        isActive: (json['isActive'] as bool?) ?? true,
        sortOrder: (json['sortOrder'] as num?)?.toInt() ?? 0,
      );
}

// ---------------------------------------------------------------------------
// Gift send result model
// ---------------------------------------------------------------------------

class GiftSendResult {
  final String giftTransactionId;
  final int multiplier;
  final bool isLucky;
  final String? serverSeedHash;

  const GiftSendResult({
    required this.giftTransactionId,
    required this.multiplier,
    required this.isLucky,
    this.serverSeedHash,
  });

  factory GiftSendResult.fromJson(Map<String, dynamic> json) {
    final tx = json['giftTransaction'] as Map<String, dynamic>? ?? json;
    return GiftSendResult(
      giftTransactionId: (tx['id'] as String?) ?? '',
      multiplier: (json['multiplier'] as num?)?.toInt() ?? 1,
      isLucky: (json['isLucky'] as bool?) ?? false,
      serverSeedHash: json['serverSeedHash'] as String?,
    );
  }
}

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

final giftsListProvider = FutureProvider<List<GiftModel>>((ref) async {
  final api = ref.watch(apiClientProvider);
  try {
    final response = await api.get(ApiConstants.gifts);
    final raw = response.data;
    final list = (raw is List ? raw : (raw['data'] ?? raw)) as List;
    return list.map((e) => GiftModel.fromJson(e as Map<String, dynamic>)).toList();
  } catch (_) {
    return [];
  }
});

final giftsByCategoryProvider = FutureProvider<Map<String, List<GiftModel>>>((ref) async {
  final api = ref.watch(apiClientProvider);
  try {
    final response = await api.get(ApiConstants.giftCategories);
    final raw = response.data as Map<String, dynamic>;
    final data = (raw['data'] ?? raw) as Map<String, dynamic>;
    return data.map((key, value) => MapEntry(
          key,
          (value as List)
              .map((e) => GiftModel.fromJson(e as Map<String, dynamic>))
              .toList(),
        ));
  } catch (_) {
    return {};
  }
});

// ---------------------------------------------------------------------------
// Gift send notifier
// ---------------------------------------------------------------------------

class GiftSendNotifier extends StateNotifier<AsyncValue<GiftSendResult?>> {
  final ApiClient _api;

  GiftSendNotifier(this._api) : super(const AsyncValue.data(null));

  Future<GiftSendResult?> send({
    required String giftId,
    required String receiverId,
    String? roomId,
    int quantity = 1,
    String? message,
  }) async {
    state = const AsyncValue.loading();
    try {
      final response = await _api.post(
        ApiConstants.sendGift,
        data: {
          'giftId': giftId,
          'receiverId': receiverId,
          if (roomId != null) 'roomId': roomId,
          'quantity': quantity,
          if (message != null) 'message': message,
        },
      );
      final raw = response.data as Map<String, dynamic>;
      final data = (raw['data'] ?? raw) as Map<String, dynamic>;
      final result = GiftSendResult.fromJson(data);
      state = AsyncValue.data(result);
      return result;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return null;
    }
  }

  void reset() => state = const AsyncValue.data(null);
}

final giftSendProvider =
    StateNotifierProvider.autoDispose<GiftSendNotifier, AsyncValue<GiftSendResult?>>((ref) {
  final api = ref.watch(apiClientProvider);
  return GiftSendNotifier(api);
});
