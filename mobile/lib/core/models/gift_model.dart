import 'package:json_annotation/json_annotation.dart';

part 'gift_model.g.dart';

enum GiftRarity { common, rare, epic, legendary }
enum GiftAnimationType { lottie, svga, sprite, static }

@JsonSerializable()
class GiftCategoryModel {
  final String id;
  final String name;
  final String? icon;
  final int sortOrder;
  final bool isActive;

  const GiftCategoryModel({
    required this.id,
    required this.name,
    this.icon,
    required this.sortOrder,
    required this.isActive,
  });

  factory GiftCategoryModel.fromJson(Map<String, dynamic> json) =>
      _$GiftCategoryModelFromJson(json);

  Map<String, dynamic> toJson() => _$GiftCategoryModelToJson(this);
}

@JsonSerializable()
class GiftModel {
  final String id;
  final String categoryId;
  final String name;
  final String? description;
  final String? imageUrl;
  final String? animationUrl;
  final GiftAnimationType animationType;
  final int price; // in coins
  final GiftRarity rarity;
  final bool isSpecial;
  final bool isNew;
  final bool isHot;
  final bool isLimited;
  final DateTime? limitedUntil;
  final int? limitedCount;
  final int? remainingCount;
  final Map<String, dynamic>? metadata;
  final int sortOrder;
  final bool isActive;

  const GiftModel({
    required this.id,
    required this.categoryId,
    required this.name,
    this.description,
    this.imageUrl,
    this.animationUrl,
    required this.animationType,
    required this.price,
    required this.rarity,
    required this.isSpecial,
    required this.isNew,
    required this.isHot,
    required this.isLimited,
    this.limitedUntil,
    this.limitedCount,
    this.remainingCount,
    this.metadata,
    required this.sortOrder,
    required this.isActive,
  });

  factory GiftModel.fromJson(Map<String, dynamic> json) =>
      _$GiftModelFromJson(json);

  Map<String, dynamic> toJson() => _$GiftModelToJson(this);

  String get displayPrice => '$price 🪙';
  bool get hasAnimation => animationUrl != null;
}

@JsonSerializable()
class GiftEventModel {
  final String id;
  final String roomId;
  final String senderId;
  final String senderName;
  final String? senderAvatar;
  final int senderVipLevel;
  final String? receiverId;
  final String? receiverName;
  final GiftModel gift;
  final int count;
  final int totalCoins;
  final DateTime timestamp;

  const GiftEventModel({
    required this.id,
    required this.roomId,
    required this.senderId,
    required this.senderName,
    this.senderAvatar,
    required this.senderVipLevel,
    this.receiverId,
    this.receiverName,
    required this.gift,
    required this.count,
    required this.totalCoins,
    required this.timestamp,
  });

  factory GiftEventModel.fromJson(Map<String, dynamic> json) =>
      _$GiftEventModelFromJson(json);

  Map<String, dynamic> toJson() => _$GiftEventModelToJson(this);
}
