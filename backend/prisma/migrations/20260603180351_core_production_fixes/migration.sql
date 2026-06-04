-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('RECHARGE', 'GIFT_SEND', 'GIFT_RECEIVE', 'TRANSFER', 'WITHDRAW', 'REWARD', 'REFUND', 'VIP_PURCHASE', 'VEHICLE_PURCHASE', 'FRAME_PURCHASE');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('COINS', 'DIAMONDS');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REVERSED');

-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('PUBLIC', 'PRIVATE', 'PASSWORD', 'FAMILY', 'VIP');

-- CreateEnum
CREATE TYPE "RoomMemberRole" AS ENUM ('HOST', 'CO_HOST', 'ADMIN', 'SPEAKER', 'LISTENER');

-- CreateEnum
CREATE TYPE "GiftCategory" AS ENUM ('NORMAL', 'LUXURY', 'COUPLE', 'FAMILY', 'LUCKY', 'VIP', 'NATION');

-- CreateEnum
CREATE TYPE "GiftType" AS ENUM ('STATIC', 'LOTTIE', 'SVGA', 'FULLSCREEN');

-- CreateEnum
CREATE TYPE "FamilyMemberRole" AS ENUM ('OWNER', 'CO_OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "CoupleStatus" AS ENUM ('ACTIVE', 'ENDED');

-- CreateEnum
CREATE TYPE "CoupleRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "BattleStatus" AS ENUM ('PENDING', 'ACTIVE', 'ENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ChatType" AS ENUM ('TEXT', 'VOICE', 'IMAGE', 'EMOJI', 'GIFT');

-- CreateEnum
CREATE TYPE "ReportTargetType" AS ENUM ('USER', 'ROOM', 'MESSAGE');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'REVIEWING', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "BanType" AS ENUM ('ROOM', 'PLATFORM', 'DEVICE', 'IP');

-- CreateEnum
CREATE TYPE "WithdrawalMethod" AS ENUM ('CLICK', 'PAYME', 'BANK', 'UZUM');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "VehicleLevel" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'LEGENDARY');

-- CreateEnum
CREATE TYPE "FrameType" AS ENUM ('AVATAR', 'MIC', 'CHAT_BUBBLE');

-- CreateEnum
CREATE TYPE "AgencyMemberRole" AS ENUM ('OWNER', 'MANAGER', 'MEMBER');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('GIFT_COMPETITION', 'RECHARGE_COMPETITION', 'LUCKY_GIFT', 'DAILY_TASK', 'SEASONAL');

-- CreateEnum
CREATE TYPE "LinkType" AS ENUM ('ROOM', 'USER', 'FAMILY', 'EVENT', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'SUPER_ADMIN', 'MODERATOR');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "googleId" TEXT,
    "appleId" TEXT,
    "username" TEXT,
    "displayName" TEXT,
    "avatar" TEXT,
    "coverImage" TEXT,
    "bio" TEXT,
    "uid" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "isVip" BOOLEAN NOT NULL DEFAULT false,
    "vipLevel" INTEGER NOT NULL DEFAULT 0,
    "vipExpiresAt" TIMESTAMP(3),
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "lastSeen" TIMESTAMP(3),
    "country" TEXT,
    "language" TEXT NOT NULL DEFAULT 'uz',
    "referralCode" TEXT,
    "referredBy" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "banReason" TEXT,
    "bannedUntil" TIMESTAMP(3),
    "deviceId" TEXT,
    "ipAddress" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "fcmToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "coins" BIGINT NOT NULL DEFAULT 0,
    "diamonds" BIGINT NOT NULL DEFAULT 0,
    "totalRecharge" BIGINT NOT NULL DEFAULT 0,
    "totalGifted" BIGINT NOT NULL DEFAULT 0,
    "totalEarned" BIGINT NOT NULL DEFAULT 0,
    "totalWithdrawn" BIGINT NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "currency" "Currency" NOT NULL,
    "amount" BIGINT NOT NULL,
    "balanceBefore" BIGINT NOT NULL,
    "balanceAfter" BIGINT NOT NULL,
    "referenceId" TEXT,
    "referenceType" TEXT,
    "description" TEXT,
    "status" "TransactionStatus" NOT NULL DEFAULT 'COMPLETED',
    "metadata" JSONB,
    "googlePlayToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vip_plans" (
    "id" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL,
    "duration" INTEGER NOT NULL,
    "features" JSONB NOT NULL,
    "frameUrl" TEXT,
    "entryEffectUrl" TEXT,
    "chatBubbleUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "vip_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_vips" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "user_vips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_rooms" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coverImage" TEXT,
    "type" "RoomType" NOT NULL DEFAULT 'PUBLIC',
    "password" TEXT,
    "maxSeats" INTEGER NOT NULL DEFAULT 8,
    "currentSeats" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT[],
    "region" TEXT,
    "announcement" TEXT,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "isLive" BOOLEAN NOT NULL DEFAULT true,
    "totalGifts" BIGINT NOT NULL DEFAULT 0,
    "viewerCount" INTEGER NOT NULL DEFAULT 0,
    "familyId" TEXT,
    "pkBattleId" TEXT,
    "language" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voice_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_seats" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "userId" TEXT,
    "isMuted" BOOLEAN NOT NULL DEFAULT false,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "invitedBy" TEXT,
    "joinedAt" TIMESTAMP(3),

    CONSTRAINT "room_seats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_members" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "RoomMemberRole" NOT NULL DEFAULT 'LISTENER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "giftsSent" BIGINT NOT NULL DEFAULT 0,
    "totalTime" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "room_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gifts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "GiftCategory" NOT NULL DEFAULT 'NORMAL',
    "type" "GiftType" NOT NULL DEFAULT 'STATIC',
    "imageUrl" TEXT NOT NULL,
    "animationUrl" TEXT,
    "coinPrice" INTEGER NOT NULL,
    "diamondPrice" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "gifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gift_transactions" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "roomId" TEXT,
    "giftId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "totalCoins" BIGINT NOT NULL,
    "totalDiamonds" BIGINT NOT NULL DEFAULT 0,
    "message" TEXT,
    "multiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gift_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "families" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "description" TEXT,
    "avatar" TEXT,
    "coverImage" TEXT,
    "announcement" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "xp" BIGINT NOT NULL DEFAULT 0,
    "treasury" BIGINT NOT NULL DEFAULT 0,
    "ownerId" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "requireApproval" BOOLEAN NOT NULL DEFAULT false,
    "maxMembers" INTEGER NOT NULL DEFAULT 50,
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "families_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_members" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "FamilyMemberRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contribution" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "family_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_battles" (
    "id" TEXT NOT NULL,
    "challengerFamilyId" TEXT NOT NULL,
    "defenderFamilyId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" "BattleStatus" NOT NULL DEFAULT 'PENDING',
    "challengerScore" BIGINT NOT NULL DEFAULT 0,
    "defenderScore" BIGINT NOT NULL DEFAULT 0,
    "winnerId" TEXT,
    "prizePool" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "family_battles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "couples" (
    "id" TEXT NOT NULL,
    "user1Id" TEXT NOT NULL,
    "user2Id" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "xp" BIGINT NOT NULL DEFAULT 0,
    "anniversaryDate" TIMESTAMP(3),
    "status" "CoupleStatus" NOT NULL DEFAULT 'ACTIVE',
    "endedAt" TIMESTAMP(3),
    "endedBy" TEXT,
    "endReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "couples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "couple_requests" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "status" "CoupleRequestStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "couple_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pk_battles" (
    "id" TEXT NOT NULL,
    "room1Id" TEXT NOT NULL,
    "room2Id" TEXT NOT NULL,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "duration" INTEGER NOT NULL DEFAULT 300,
    "status" "BattleStatus" NOT NULL DEFAULT 'PENDING',
    "room1Score" BIGINT NOT NULL DEFAULT 0,
    "room2Score" BIGINT NOT NULL DEFAULT 0,
    "winnerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_battles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follows" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chats" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "content" TEXT,
    "type" "ChatType" NOT NULL DEFAULT 'TEXT',
    "mediaUrl" TEXT,
    "duration" INTEGER,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetType" "ReportTargetType" NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "evidence" JSONB,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bans" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "type" "BanType" NOT NULL,
    "reason" TEXT NOT NULL,
    "bannedUntil" TIMESTAMP(3),
    "isPermanent" BOOLEAN NOT NULL DEFAULT false,
    "roomId" TEXT,
    "deviceId" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agencies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo" TEXT,
    "description" TEXT,
    "ownerId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "commission" DOUBLE PRECISION NOT NULL DEFAULT 20.0,
    "totalEarnings" BIGINT NOT NULL DEFAULT 0,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agency_members" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "AgencyMemberRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalEarnings" BIGINT NOT NULL DEFAULT 0,
    "commission" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "agency_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawals" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "currency" "Currency" NOT NULL,
    "method" "WithdrawalMethod" NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "processedBy" TEXT,
    "processedAt" TIMESTAMP(3),
    "txId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "withdrawals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_rewards" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" INTEGER NOT NULL,
    "reward" JSONB NOT NULL,
    "claimed" BOOLEAN NOT NULL DEFAULT false,
    "claimedAt" TIMESTAMP(3),
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "requirement" INTEGER NOT NULL,
    "rewardCoins" INTEGER NOT NULL DEFAULT 0,
    "rewardDiamonds" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_achievements" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "EventType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "banner" TEXT,
    "rewards" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banners" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "linkType" "LinkType",
    "linkValue" TEXT,
    "position" TEXT NOT NULL DEFAULT 'HOME',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" "VehicleLevel" NOT NULL,
    "animationUrl" TEXT NOT NULL,
    "previewUrl" TEXT,
    "coinPrice" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 30,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_vehicles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "frames" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FrameType" NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,
    "coinPrice" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 30,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "frames_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_frames" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "frameId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_frames_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "adminId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "details" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "users_appleId_key" ON "users"("appleId");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_uid_key" ON "users"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "users_referralCode_key" ON "users"("referralCode");

-- CreateIndex
CREATE INDEX "users_phone_idx" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_uid_idx" ON "users"("uid");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_country_idx" ON "users"("country");

-- CreateIndex
CREATE INDEX "users_isOnline_idx" ON "users"("isOnline");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_userId_key" ON "wallets"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_googlePlayToken_key" ON "transactions"("googlePlayToken");

-- CreateIndex
CREATE INDEX "transactions_userId_idx" ON "transactions"("userId");

-- CreateIndex
CREATE INDEX "transactions_type_idx" ON "transactions"("type");

-- CreateIndex
CREATE INDEX "transactions_createdAt_idx" ON "transactions"("createdAt");

-- CreateIndex
CREATE INDEX "transactions_referenceId_idx" ON "transactions"("referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "vip_plans_level_key" ON "vip_plans"("level");

-- CreateIndex
CREATE INDEX "user_vips_userId_idx" ON "user_vips"("userId");

-- CreateIndex
CREATE INDEX "user_vips_expiresAt_idx" ON "user_vips"("expiresAt");

-- CreateIndex
CREATE INDEX "voice_rooms_hostId_idx" ON "voice_rooms"("hostId");

-- CreateIndex
CREATE INDEX "voice_rooms_type_idx" ON "voice_rooms"("type");

-- CreateIndex
CREATE INDEX "voice_rooms_isLive_idx" ON "voice_rooms"("isLive");

-- CreateIndex
CREATE INDEX "voice_rooms_region_idx" ON "voice_rooms"("region");

-- CreateIndex
CREATE INDEX "voice_rooms_familyId_idx" ON "voice_rooms"("familyId");

-- CreateIndex
CREATE INDEX "room_seats_roomId_idx" ON "room_seats"("roomId");

-- CreateIndex
CREATE INDEX "room_seats_userId_idx" ON "room_seats"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "room_seats_roomId_position_key" ON "room_seats"("roomId", "position");

-- CreateIndex
CREATE INDEX "room_members_roomId_idx" ON "room_members"("roomId");

-- CreateIndex
CREATE INDEX "room_members_userId_idx" ON "room_members"("userId");

-- CreateIndex
CREATE INDEX "room_members_joinedAt_idx" ON "room_members"("joinedAt");

-- CreateIndex
CREATE INDEX "gifts_category_idx" ON "gifts"("category");

-- CreateIndex
CREATE INDEX "gifts_isActive_idx" ON "gifts"("isActive");

-- CreateIndex
CREATE INDEX "gift_transactions_senderId_idx" ON "gift_transactions"("senderId");

-- CreateIndex
CREATE INDEX "gift_transactions_receiverId_idx" ON "gift_transactions"("receiverId");

-- CreateIndex
CREATE INDEX "gift_transactions_roomId_idx" ON "gift_transactions"("roomId");

-- CreateIndex
CREATE INDEX "gift_transactions_createdAt_idx" ON "gift_transactions"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "families_name_key" ON "families"("name");

-- CreateIndex
CREATE UNIQUE INDEX "families_tag_key" ON "families"("tag");

-- CreateIndex
CREATE UNIQUE INDEX "families_ownerId_key" ON "families"("ownerId");

-- CreateIndex
CREATE INDEX "families_country_idx" ON "families"("country");

-- CreateIndex
CREATE INDEX "family_members_familyId_idx" ON "family_members"("familyId");

-- CreateIndex
CREATE INDEX "family_members_userId_idx" ON "family_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "family_members_familyId_userId_key" ON "family_members"("familyId", "userId");

-- CreateIndex
CREATE INDEX "family_battles_challengerFamilyId_idx" ON "family_battles"("challengerFamilyId");

-- CreateIndex
CREATE INDEX "family_battles_defenderFamilyId_idx" ON "family_battles"("defenderFamilyId");

-- CreateIndex
CREATE INDEX "family_battles_status_idx" ON "family_battles"("status");

-- CreateIndex
CREATE INDEX "couples_user1Id_idx" ON "couples"("user1Id");

-- CreateIndex
CREATE INDEX "couples_user2Id_idx" ON "couples"("user2Id");

-- CreateIndex
CREATE INDEX "couple_requests_senderId_idx" ON "couple_requests"("senderId");

-- CreateIndex
CREATE INDEX "couple_requests_receiverId_idx" ON "couple_requests"("receiverId");

-- CreateIndex
CREATE INDEX "pk_battles_room1Id_idx" ON "pk_battles"("room1Id");

-- CreateIndex
CREATE INDEX "pk_battles_room2Id_idx" ON "pk_battles"("room2Id");

-- CreateIndex
CREATE INDEX "pk_battles_status_idx" ON "pk_battles"("status");

-- CreateIndex
CREATE INDEX "follows_followerId_idx" ON "follows"("followerId");

-- CreateIndex
CREATE INDEX "follows_followingId_idx" ON "follows"("followingId");

-- CreateIndex
CREATE UNIQUE INDEX "follows_followerId_followingId_key" ON "follows"("followerId", "followingId");

-- CreateIndex
CREATE INDEX "chats_senderId_receiverId_idx" ON "chats"("senderId", "receiverId");

-- CreateIndex
CREATE INDEX "chats_receiverId_senderId_idx" ON "chats"("receiverId", "senderId");

-- CreateIndex
CREATE INDEX "chats_createdAt_idx" ON "chats"("createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_isRead_idx" ON "notifications"("isRead");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE INDEX "reports_reporterId_idx" ON "reports"("reporterId");

-- CreateIndex
CREATE INDEX "reports_targetId_idx" ON "reports"("targetId");

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- CreateIndex
CREATE INDEX "bans_userId_idx" ON "bans"("userId");

-- CreateIndex
CREATE INDEX "bans_type_idx" ON "bans"("type");

-- CreateIndex
CREATE UNIQUE INDEX "agencies_name_key" ON "agencies"("name");

-- CreateIndex
CREATE UNIQUE INDEX "agencies_ownerId_key" ON "agencies"("ownerId");

-- CreateIndex
CREATE INDEX "agencies_country_idx" ON "agencies"("country");

-- CreateIndex
CREATE INDEX "agency_members_agencyId_idx" ON "agency_members"("agencyId");

-- CreateIndex
CREATE INDEX "agency_members_userId_idx" ON "agency_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "agency_members_agencyId_userId_key" ON "agency_members"("agencyId", "userId");

-- CreateIndex
CREATE INDEX "withdrawals_userId_idx" ON "withdrawals"("userId");

-- CreateIndex
CREATE INDEX "withdrawals_status_idx" ON "withdrawals"("status");

-- CreateIndex
CREATE INDEX "withdrawals_createdAt_idx" ON "withdrawals"("createdAt");

-- CreateIndex
CREATE INDEX "daily_rewards_userId_idx" ON "daily_rewards"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "daily_rewards_userId_day_key" ON "daily_rewards"("userId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "achievements_name_key" ON "achievements"("name");

-- CreateIndex
CREATE INDEX "user_achievements_userId_idx" ON "user_achievements"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_achievements_userId_achievementId_key" ON "user_achievements"("userId", "achievementId");

-- CreateIndex
CREATE INDEX "events_isActive_idx" ON "events"("isActive");

-- CreateIndex
CREATE INDEX "events_startDate_endDate_idx" ON "events"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "banners_isActive_idx" ON "banners"("isActive");

-- CreateIndex
CREATE INDEX "banners_position_idx" ON "banners"("position");

-- CreateIndex
CREATE INDEX "vehicles_level_idx" ON "vehicles"("level");

-- CreateIndex
CREATE INDEX "user_vehicles_userId_idx" ON "user_vehicles"("userId");

-- CreateIndex
CREATE INDEX "user_vehicles_expiresAt_idx" ON "user_vehicles"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_vehicles_userId_vehicleId_key" ON "user_vehicles"("userId", "vehicleId");

-- CreateIndex
CREATE INDEX "frames_type_idx" ON "frames"("type");

-- CreateIndex
CREATE INDEX "user_frames_userId_idx" ON "user_frames"("userId");

-- CreateIndex
CREATE INDEX "user_frames_expiresAt_idx" ON "user_frames"("expiresAt");

-- CreateIndex
CREATE INDEX "audit_logs_adminId_idx" ON "audit_logs"("adminId");

-- CreateIndex
CREATE INDEX "audit_logs_targetType_targetId_idx" ON "audit_logs"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_vips" ADD CONSTRAINT "user_vips_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_vips" ADD CONSTRAINT "user_vips_planId_fkey" FOREIGN KEY ("planId") REFERENCES "vip_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_rooms" ADD CONSTRAINT "voice_rooms_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_rooms" ADD CONSTRAINT "voice_rooms_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_seats" ADD CONSTRAINT "room_seats_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "voice_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_seats" ADD CONSTRAINT "room_seats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_members" ADD CONSTRAINT "room_members_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "voice_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_members" ADD CONSTRAINT "room_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_transactions" ADD CONSTRAINT "gift_transactions_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_transactions" ADD CONSTRAINT "gift_transactions_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_transactions" ADD CONSTRAINT "gift_transactions_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "voice_rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_transactions" ADD CONSTRAINT "gift_transactions_giftId_fkey" FOREIGN KEY ("giftId") REFERENCES "gifts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "families" ADD CONSTRAINT "families_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_battles" ADD CONSTRAINT "family_battles_challengerFamilyId_fkey" FOREIGN KEY ("challengerFamilyId") REFERENCES "families"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_battles" ADD CONSTRAINT "family_battles_defenderFamilyId_fkey" FOREIGN KEY ("defenderFamilyId") REFERENCES "families"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couples" ADD CONSTRAINT "couples_user1Id_fkey" FOREIGN KEY ("user1Id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couples" ADD CONSTRAINT "couples_user2Id_fkey" FOREIGN KEY ("user2Id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_requests" ADD CONSTRAINT "couple_requests_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_requests" ADD CONSTRAINT "couple_requests_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pk_battles" ADD CONSTRAINT "pk_battles_room1Id_fkey" FOREIGN KEY ("room1Id") REFERENCES "voice_rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pk_battles" ADD CONSTRAINT "pk_battles_room2Id_fkey" FOREIGN KEY ("room2Id") REFERENCES "voice_rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chats" ADD CONSTRAINT "chats_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chats" ADD CONSTRAINT "chats_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bans" ADD CONSTRAINT "bans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bans" ADD CONSTRAINT "bans_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agencies" ADD CONSTRAINT "agencies_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_members" ADD CONSTRAINT "agency_members_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_members" ADD CONSTRAINT "agency_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_processedBy_fkey" FOREIGN KEY ("processedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_rewards" ADD CONSTRAINT "daily_rewards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "achievements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_vehicles" ADD CONSTRAINT "user_vehicles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_vehicles" ADD CONSTRAINT "user_vehicles_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_frames" ADD CONSTRAINT "user_frames_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_frames" ADD CONSTRAINT "user_frames_frameId_fkey" FOREIGN KEY ("frameId") REFERENCES "frames"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
