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
