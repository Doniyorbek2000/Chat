import 'package:json_annotation/json_annotation.dart';
import 'user_model.dart';

part 'room_model.g.dart';

enum RoomType { public, private, password, family, vip }
enum RoomStatus { live, ended, paused }
enum SeatStatus { empty, occupied, locked }
enum PkStatus { none, pending, active, ended }

@JsonSerializable()
class SeatModel {
  final int index;
  final SeatStatus status;
  final UserModel? user;
  final bool isMicOn;
  final bool isMuted;
  final bool isHost;
  final bool isCoHost;
  final int speakingLevel; // 0-100

  const SeatModel({
    required this.index,
    required this.status,
    this.user,
    required this.isMicOn,
    required this.isMuted,
    required this.isHost,
    required this.isCoHost,
    required this.speakingLevel,
  });

  factory SeatModel.fromJson(Map<String, dynamic> json) =>
      _$SeatModelFromJson(json);

  Map<String, dynamic> toJson() => _$SeatModelToJson(this);

  SeatModel copyWith({
    int? index,
    SeatStatus? status,
    UserModel? user,
    bool? isMicOn,
    bool? isMuted,
    bool? isHost,
    bool? isCoHost,
    int? speakingLevel,
  }) {
    return SeatModel(
      index: index ?? this.index,
      status: status ?? this.status,
      user: user ?? this.user,
      isMicOn: isMicOn ?? this.isMicOn,
      isMuted: isMuted ?? this.isMuted,
      isHost: isHost ?? this.isHost,
      isCoHost: isCoHost ?? this.isCoHost,
      speakingLevel: speakingLevel ?? this.speakingLevel,
    );
  }

  bool get isEmpty => status == SeatStatus.empty;
  bool get isLocked => status == SeatStatus.locked;
  bool get isOccupied => status == SeatStatus.occupied;
}

@JsonSerializable()
class PkBattleModel {
  final String id;
  final String roomId1;
  final String roomId2;
  final String hostId1;
  final String hostId2;
  final String hostName1;
  final String hostName2;
  final String? hostAvatar1;
  final String? hostAvatar2;
  final int score1;
  final int score2;
  final DateTime startTime;
  final DateTime endTime;
  final PkStatus status;
  final String? winnerId;

  const PkBattleModel({
    required this.id,
    required this.roomId1,
    required this.roomId2,
    required this.hostId1,
    required this.hostId2,
    required this.hostName1,
    required this.hostName2,
    this.hostAvatar1,
    this.hostAvatar2,
    required this.score1,
    required this.score2,
    required this.startTime,
    required this.endTime,
    required this.status,
    this.winnerId,
  });

  factory PkBattleModel.fromJson(Map<String, dynamic> json) =>
      _$PkBattleModelFromJson(json);

  Map<String, dynamic> toJson() => _$PkBattleModelToJson(this);

  Duration get remainingTime {
    final now = DateTime.now();
    if (now.isAfter(endTime)) return Duration.zero;
    return endTime.difference(now);
  }

  bool get isActive => status == PkStatus.active;
}

@JsonSerializable()
class RoomModel {
  final String id;
  final String title;
  final String? description;
  final String? cover;
  final RoomType type;
  final RoomStatus status;
  final UserModel host;
  final List<SeatModel> seats;
  final int maxSeats;
  final int viewerCount;
  final int totalGifts;
  final String? announcement;
  final List<String>? tags;
  final String language;
  final String? theme;
  final String? backgroundUrl;
  final bool allowScreenshot;
  final bool allowRecord;
  final PkBattleModel? pkBattle;
  final String? familyId;
  final int level;
  final DateTime createdAt;
  final DateTime? endedAt;
  final bool isJoined;
  final int? userSeatIndex;
  final List<RoomMessageModel> recentMessages;

  const RoomModel({
    required this.id,
    required this.title,
    this.description,
    this.cover,
    required this.type,
    required this.status,
    required this.host,
    required this.seats,
    required this.maxSeats,
    required this.viewerCount,
    required this.totalGifts,
    this.announcement,
    this.tags,
    required this.language,
    this.theme,
    this.backgroundUrl,
    required this.allowScreenshot,
    required this.allowRecord,
    this.pkBattle,
    this.familyId,
    required this.level,
    required this.createdAt,
    this.endedAt,
    required this.isJoined,
    this.userSeatIndex,
    required this.recentMessages,
  });

  factory RoomModel.fromJson(Map<String, dynamic> json) =>
      _$RoomModelFromJson(json);

  Map<String, dynamic> toJson() => _$RoomModelToJson(this);

  bool get isLive => status == RoomStatus.live;
  bool get isPublic => type == RoomType.public;
  bool get hasPkBattle => pkBattle != null && pkBattle!.isActive;
  int get occupiedSeats => seats.where((s) => s.isOccupied).length;
  bool get isFull => occupiedSeats >= maxSeats;
  String get coverUrl => cover ?? 'https://picsum.photos/seed/$id/400/300';
}

@JsonSerializable()
class RoomMessageModel {
  final String id;
  final String roomId;
  final String userId;
  final String username;
  final String? userAvatar;
  final int userVipLevel;
  final String type; // text, gift, system, join, leave
  final String content;
  final Map<String, dynamic>? extra;
  final DateTime timestamp;

  const RoomMessageModel({
    required this.id,
    required this.roomId,
    required this.userId,
    required this.username,
    this.userAvatar,
    required this.userVipLevel,
    required this.type,
    required this.content,
    this.extra,
    required this.timestamp,
  });

  factory RoomMessageModel.fromJson(Map<String, dynamic> json) =>
      _$RoomMessageModelFromJson(json);

  Map<String, dynamic> toJson() => _$RoomMessageModelToJson(this);

  bool get isSystem => type == 'system';
  bool get isGift => type == 'gift';
  bool get isJoin => type == 'join';
  bool get isLeave => type == 'leave';
  bool get isText => type == 'text';
}
