import 'package:json_annotation/json_annotation.dart';

part 'wallet_model.g.dart';

enum TransactionType {
  recharge,
  gift_sent,
  gift_received,
  transfer,
  withdraw,
  refund,
  vip_purchase,
  family_donate,
  pk_reward,
  daily_bonus,
  event_reward,
}

enum TransactionStatus { pending, completed, failed, cancelled }

@JsonSerializable()
class TransactionModel {
  final String id;
  final String userId;
  final TransactionType type;
  final TransactionStatus status;
  final int amount; // positive = credit, negative = debit
  final String currency; // coins or diamonds
  final int balanceBefore;
  final int balanceAfter;
  final String? description;
  final String? referenceId;
  final Map<String, dynamic>? metadata;
  final DateTime createdAt;

  const TransactionModel({
    required this.id,
    required this.userId,
    required this.type,
    required this.status,
    required this.amount,
    required this.currency,
    required this.balanceBefore,
    required this.balanceAfter,
    this.description,
    this.referenceId,
    this.metadata,
    required this.createdAt,
  });

  factory TransactionModel.fromJson(Map<String, dynamic> json) =>
      _$TransactionModelFromJson(json);

  Map<String, dynamic> toJson() => _$TransactionModelToJson(this);

  bool get isCredit => amount > 0;
  bool get isDebit => amount < 0;
  bool get isCompleted => status == TransactionStatus.completed;
}

@JsonSerializable()
class WalletModel {
  final String userId;
  final int coins;
  final int diamonds;
  final int pendingWithdraw;
  final double totalRecharge;
  final double totalWithdraw;
  final double totalGiftsSent;
  final double totalGiftsReceived;
  final List<TransactionModel> recentTransactions;
  final DateTime updatedAt;

  const WalletModel({
    required this.userId,
    required this.coins,
    required this.diamonds,
    required this.pendingWithdraw,
    required this.totalRecharge,
    required this.totalWithdraw,
    required this.totalGiftsSent,
    required this.totalGiftsReceived,
    required this.recentTransactions,
    required this.updatedAt,
  });

  factory WalletModel.fromJson(Map<String, dynamic> json) =>
      _$WalletModelFromJson(json);

  Map<String, dynamic> toJson() => _$WalletModelToJson(this);

  WalletModel copyWith({
    String? userId,
    int? coins,
    int? diamonds,
    int? pendingWithdraw,
    double? totalRecharge,
    double? totalWithdraw,
    double? totalGiftsSent,
    double? totalGiftsReceived,
    List<TransactionModel>? recentTransactions,
    DateTime? updatedAt,
  }) {
    return WalletModel(
      userId: userId ?? this.userId,
      coins: coins ?? this.coins,
      diamonds: diamonds ?? this.diamonds,
      pendingWithdraw: pendingWithdraw ?? this.pendingWithdraw,
      totalRecharge: totalRecharge ?? this.totalRecharge,
      totalWithdraw: totalWithdraw ?? this.totalWithdraw,
      totalGiftsSent: totalGiftsSent ?? this.totalGiftsSent,
      totalGiftsReceived: totalGiftsReceived ?? this.totalGiftsReceived,
      recentTransactions: recentTransactions ?? this.recentTransactions,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}

@JsonSerializable()
class RechargePackageModel {
  final String id;
  final String name;
  final int coins;
  final int bonusCoins;
  final double price;
  final String currency;
  final bool isPopular;
  final bool isLimited;
  final String? badgeText;
  final DateTime? limitedUntil;

  const RechargePackageModel({
    required this.id,
    required this.name,
    required this.coins,
    required this.bonusCoins,
    required this.price,
    required this.currency,
    required this.isPopular,
    required this.isLimited,
    this.badgeText,
    this.limitedUntil,
  });

  factory RechargePackageModel.fromJson(Map<String, dynamic> json) =>
      _$RechargePackageModelFromJson(json);

  Map<String, dynamic> toJson() => _$RechargePackageModelToJson(this);

  int get totalCoins => coins + bonusCoins;
  bool get hasBonus => bonusCoins > 0;
}

/// Recharge product loaded from GET /wallet/recharge-products
class RechargeProductModel {
  final String productId;
  final String title;
  final String type; // COINS, DIAMONDS, FIRST_RECHARGE
  final int baseAmount;
  final int bonusAmount;
  final int priceUzs;
  final bool isFirstRechargeOnly;
  final bool isActive;
  final int sortOrder;

  const RechargeProductModel({
    required this.productId,
    required this.title,
    required this.type,
    required this.baseAmount,
    required this.bonusAmount,
    required this.priceUzs,
    required this.isFirstRechargeOnly,
    required this.isActive,
    required this.sortOrder,
  });

  factory RechargeProductModel.fromJson(Map<String, dynamic> json) {
    return RechargeProductModel(
      productId: json['productId'] as String,
      title: json['title'] as String,
      type: json['type'] as String,
      baseAmount: _parseInt(json['baseAmount']),
      bonusAmount: _parseInt(json['bonusAmount']),
      priceUzs: _parseInt(json['priceUzs']),
      isFirstRechargeOnly: json['isFirstRechargeOnly'] as bool? ?? false,
      isActive: json['isActive'] as bool? ?? true,
      sortOrder: _parseInt(json['sortOrder']),
    );
  }

  int get totalAmount => baseAmount + bonusAmount;
  bool get hasBonus => bonusAmount > 0;
  bool get isDiamonds => type == 'DIAMONDS';
  bool get isCoins => type == 'COINS';
  bool get isFirstRecharge => type == 'FIRST_RECHARGE';
}

class DailyRechargeProgress {
  final String date;
  final int totalCoins;
  final List<int> thresholds;
  final List<int> rewards;
  final List<int> claimedTiers;
  final int nextTier;

  const DailyRechargeProgress({
    required this.date,
    required this.totalCoins,
    required this.thresholds,
    required this.rewards,
    required this.claimedTiers,
    required this.nextTier,
  });

  factory DailyRechargeProgress.fromJson(Map<String, dynamic> json) {
    return DailyRechargeProgress(
      date: json['date'] as String,
      totalCoins: _parseInt(json['totalCoins']),
      thresholds: (json['thresholds'] as List).map((e) => _parseInt(e)).toList(),
      rewards: (json['rewards'] as List).map((e) => _parseInt(e)).toList(),
      claimedTiers: (json['claimedTiers'] as List? ?? []).map((e) => _parseInt(e)).toList(),
      nextTier: _parseInt(json['nextTier']) ,
    );
  }

  bool get hasClaimable => nextTier >= 0 && nextTier < thresholds.length && totalCoins >= thresholds[nextTier];
}

class FirstRechargeOffer {
  final bool eligible;
  final List<FirstRechargeOfferItem> offers;

  const FirstRechargeOffer({required this.eligible, required this.offers});

  factory FirstRechargeOffer.fromJson(Map<String, dynamic> json) {
    final offerList = (json['offers'] as List? ?? [])
        .map((e) => FirstRechargeOfferItem.fromJson(e as Map<String, dynamic>))
        .toList();
    return FirstRechargeOffer(eligible: json['eligible'] as bool? ?? false, offers: offerList);
  }
}

class FirstRechargeOfferItem {
  final String productId;
  final int priceUzs;
  final int coins;
  final int bonusCoins;

  const FirstRechargeOfferItem({
    required this.productId,
    required this.priceUzs,
    required this.coins,
    required this.bonusCoins,
  });

  factory FirstRechargeOfferItem.fromJson(Map<String, dynamic> json) {
    return FirstRechargeOfferItem(
      productId: json['productId'] as String,
      priceUzs: _parseInt(json['priceUzs']),
      coins: _parseInt(json['coins']),
      bonusCoins: _parseInt(json['bonusCoins']),
    );
  }
}

int _parseInt(dynamic value) {
  if (value == null) return 0;
  if (value is int) return value;
  if (value is double) return value.toInt();
  if (value is String) return int.tryParse(value) ?? 0;
  return 0;
}

@JsonSerializable()
class PaymentMethodModel {
  final String id;
  final String name;
  final String type; // click, payme, uzum, google_play, apple_pay, card
  final String? logoUrl;
  final bool isAvailable;
  final double? minAmount;
  final double? maxAmount;
  final double? feePercent;
  final int? feeFixed;

  const PaymentMethodModel({
    required this.id,
    required this.name,
    required this.type,
    this.logoUrl,
    required this.isAvailable,
    this.minAmount,
    this.maxAmount,
    this.feePercent,
    this.feeFixed,
  });

  factory PaymentMethodModel.fromJson(Map<String, dynamic> json) =>
      _$PaymentMethodModelFromJson(json);

  Map<String, dynamic> toJson() => _$PaymentMethodModelToJson(this);
}
