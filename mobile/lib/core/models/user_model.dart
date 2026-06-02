import 'package:json_annotation/json_annotation.dart';

part 'user_model.g.dart';

@JsonSerializable()
class UserModel {
  final String id;
  final String uid;
  final String username;
  final String displayName;
  final String? avatar;
  final String? cover;
  final String? bio;
  final String phone;
  final String? email;
  final String gender;
  final String? birthday;
  final String? country;
  final String? city;
  final String language;
  final int level;
  final int xp;
  final int xpToNextLevel;
  final int vipLevel;
  final DateTime? vipExpiry;
  final int coins;
  final int diamonds;
  final int followersCount;
  final int followingCount;
  final int giftsReceived;
  final int giftsGiven;
  final double totalEarnings;
  final bool isHost;
  final bool isAgency;
  final bool isVerified;
  final bool isGuest;
  final bool isOnline;
  final DateTime? lastSeen;
  final String? familyId;
  final String? coupleId;
  final String? vehicleId;
  final String? frameId;
  final List<String>? badges;
  final List<String>? titles;
  final String role; // user, moderator, admin
  final bool isMuted;
  final bool isBanned;
  final DateTime createdAt;
  final DateTime updatedAt;
  final bool isFollowing;
  final bool isFollowedBy;
  final bool isBlocked;

  const UserModel({
    required this.id,
    required this.uid,
    required this.username,
    required this.displayName,
    this.avatar,
    this.cover,
    this.bio,
    required this.phone,
    this.email,
    required this.gender,
    this.birthday,
    this.country,
    this.city,
    required this.language,
    required this.level,
    required this.xp,
    required this.xpToNextLevel,
    required this.vipLevel,
    this.vipExpiry,
    required this.coins,
    required this.diamonds,
    required this.followersCount,
    required this.followingCount,
    required this.giftsReceived,
    required this.giftsGiven,
    required this.totalEarnings,
    required this.isHost,
    required this.isAgency,
    required this.isVerified,
    required this.isGuest,
    required this.isOnline,
    this.lastSeen,
    this.familyId,
    this.coupleId,
    this.vehicleId,
    this.frameId,
    this.badges,
    this.titles,
    required this.role,
    required this.isMuted,
    required this.isBanned,
    required this.createdAt,
    required this.updatedAt,
    required this.isFollowing,
    required this.isFollowedBy,
    required this.isBlocked,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) =>
      _$UserModelFromJson(json);

  Map<String, dynamic> toJson() => _$UserModelToJson(this);

  UserModel copyWith({
    String? id,
    String? uid,
    String? username,
    String? displayName,
    String? avatar,
    String? cover,
    String? bio,
    String? phone,
    String? email,
    String? gender,
    String? birthday,
    String? country,
    String? city,
    String? language,
    int? level,
    int? xp,
    int? xpToNextLevel,
    int? vipLevel,
    DateTime? vipExpiry,
    int? coins,
    int? diamonds,
    int? followersCount,
    int? followingCount,
    int? giftsReceived,
    int? giftsGiven,
    double? totalEarnings,
    bool? isHost,
    bool? isAgency,
    bool? isVerified,
    bool? isGuest,
    bool? isOnline,
    DateTime? lastSeen,
    String? familyId,
    String? coupleId,
    String? vehicleId,
    String? frameId,
    List<String>? badges,
    List<String>? titles,
    String? role,
    bool? isMuted,
    bool? isBanned,
    DateTime? createdAt,
    DateTime? updatedAt,
    bool? isFollowing,
    bool? isFollowedBy,
    bool? isBlocked,
  }) {
    return UserModel(
      id: id ?? this.id,
      uid: uid ?? this.uid,
      username: username ?? this.username,
      displayName: displayName ?? this.displayName,
      avatar: avatar ?? this.avatar,
      cover: cover ?? this.cover,
      bio: bio ?? this.bio,
      phone: phone ?? this.phone,
      email: email ?? this.email,
      gender: gender ?? this.gender,
      birthday: birthday ?? this.birthday,
      country: country ?? this.country,
      city: city ?? this.city,
      language: language ?? this.language,
      level: level ?? this.level,
      xp: xp ?? this.xp,
      xpToNextLevel: xpToNextLevel ?? this.xpToNextLevel,
      vipLevel: vipLevel ?? this.vipLevel,
      vipExpiry: vipExpiry ?? this.vipExpiry,
      coins: coins ?? this.coins,
      diamonds: diamonds ?? this.diamonds,
      followersCount: followersCount ?? this.followersCount,
      followingCount: followingCount ?? this.followingCount,
      giftsReceived: giftsReceived ?? this.giftsReceived,
      giftsGiven: giftsGiven ?? this.giftsGiven,
      totalEarnings: totalEarnings ?? this.totalEarnings,
      isHost: isHost ?? this.isHost,
      isAgency: isAgency ?? this.isAgency,
      isVerified: isVerified ?? this.isVerified,
      isGuest: isGuest ?? this.isGuest,
      isOnline: isOnline ?? this.isOnline,
      lastSeen: lastSeen ?? this.lastSeen,
      familyId: familyId ?? this.familyId,
      coupleId: coupleId ?? this.coupleId,
      vehicleId: vehicleId ?? this.vehicleId,
      frameId: frameId ?? this.frameId,
      badges: badges ?? this.badges,
      titles: titles ?? this.titles,
      role: role ?? this.role,
      isMuted: isMuted ?? this.isMuted,
      isBanned: isBanned ?? this.isBanned,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      isFollowing: isFollowing ?? this.isFollowing,
      isFollowedBy: isFollowedBy ?? this.isFollowedBy,
      isBlocked: isBlocked ?? this.isBlocked,
    );
  }

  bool get isVip => vipLevel > 0;
  bool get isAdmin => role == 'admin';
  bool get isModerator => role == 'moderator' || role == 'admin';
  String get avatarUrl => avatar ?? 'https://api.dicebear.com/7.x/avataaars/png?seed=$uid';
}

// Stub g.dart for code to compile without build_runner
// In production, run: flutter pub run build_runner build
