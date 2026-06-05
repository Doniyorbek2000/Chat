-- Stage 9: Growth / Retention / Host Monetization / Anti-Fraud
-- Migration: growth_retention_host_risk

-- Enums
CREATE TYPE "MissionPeriod" AS ENUM ('DAILY', 'WEEKLY', 'SPECIAL');
CREATE TYPE "MissionActionType" AS ENUM ('LOGIN', 'SEND_GIFT', 'JOIN_ROOM', 'HOST_ROOM', 'LIKE_POST', 'COMMENT_POST', 'ADD_FRIEND', 'STREAK_3', 'SEND_MESSAGE');
CREATE TYPE "MissionRewardType" AS ENUM ('COINS', 'DIAMONDS', 'VIP_POINTS', 'EXP', 'TICKET');
CREATE TYPE "HostLevelTier" AS ENUM ('ROOKIE', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'LEGEND');
CREATE TYPE "PkSeasonStatus" AS ENUM ('UPCOMING', 'ACTIVE', 'ENDED');
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "RiskActionType" AS ENUM ('FLAG', 'WARN', 'RESTRICT_WITHDRAWAL', 'SUSPEND', 'BAN');
CREATE TYPE "RiskEventType" AS ENUM ('MULTI_ACCOUNT', 'SELF_REFERRAL', 'CIRCULAR_GIFT', 'GIFT_SPAM', 'SUSPICIOUS_WITHDRAWAL', 'DEVICE_FRAUD', 'IP_FRAUD', 'WEBHOOK_REPLAY');
CREATE TYPE "BadgeType" AS ENUM ('PHONE_VERIFIED', 'EMAIL_VERIFIED', 'VERIFIED_HOST', 'VERIFIED_AGENCY', 'OFFICIAL', 'SAFE_ROOM', 'TOP_CREATOR');
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED');
CREATE TYPE "EarningType" AS ENUM ('GIFT_INCOME', 'BONUS', 'ADJUSTMENT');

-- Live Room Top Supporters
CREATE TABLE "room_supporter_snapshots" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "giftValue" BIGINT NOT NULL DEFAULT 0,
    "giftCount" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "snapshotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "room_supporter_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "room_session_gift_stats" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionKey" TEXT NOT NULL,
    "giftValue" BIGINT NOT NULL DEFAULT 0,
    "giftCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "room_session_gift_stats_pkey" PRIMARY KEY ("id")
);

-- Host Level
CREATE TABLE "host_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "tier" "HostLevelTier" NOT NULL DEFAULT 'ROOKIE',
    "xp" INTEGER NOT NULL DEFAULT 0,
    "totalLiveMinutes" INTEGER NOT NULL DEFAULT 0,
    "totalViewers" INTEGER NOT NULL DEFAULT 0,
    "totalGiftValue" BIGINT NOT NULL DEFAULT 0,
    "totalFollowers" INTEGER NOT NULL DEFAULT 0,
    "pkWins" INTEGER NOT NULL DEFAULT 0,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "host_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "host_level_rules" (
    "id" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "tier" "HostLevelTier" NOT NULL,
    "minXp" INTEGER NOT NULL,
    "maxXp" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "rewardCoins" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "host_level_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "host_daily_stats" (
    "id" TEXT NOT NULL,
    "hostProfileId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "liveMinutes" INTEGER NOT NULL DEFAULT 0,
    "viewers" INTEGER NOT NULL DEFAULT 0,
    "giftValue" BIGINT NOT NULL DEFAULT 0,
    "newFollowers" INTEGER NOT NULL DEFAULT 0,
    "pkWins" INTEGER NOT NULL DEFAULT 0,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "host_daily_stats_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "host_ranking_snapshots" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "score" BIGINT NOT NULL DEFAULT 0,
    "snapshotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "host_ranking_snapshots_pkey" PRIMARY KEY ("id")
);

-- Daily Missions
CREATE TABLE "missions" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "period" "MissionPeriod" NOT NULL,
    "actionType" "MissionActionType" NOT NULL,
    "targetCount" INTEGER NOT NULL DEFAULT 1,
    "rewardType" "MissionRewardType" NOT NULL,
    "rewardAmount" BIGINT NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "missions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_mission_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "isClaimed" BOOLEAN NOT NULL DEFAULT false,
    "claimedAt" TIMESTAMP(3),
    "periodKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_mission_progress_pkey" PRIMARY KEY ("id")
);

-- PK Battle Season
CREATE TABLE "pk_seasons" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "PkSeasonStatus" NOT NULL DEFAULT 'UPCOMING',
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "pk_seasons_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pk_season_participants" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "winStreak" INTEGER NOT NULL DEFAULT 0,
    "maxStreak" INTEGER NOT NULL DEFAULT 0,
    "totalScore" BIGINT NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "isRewarded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "pk_season_participants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pk_season_rewards" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "rankFrom" INTEGER NOT NULL,
    "rankTo" INTEGER NOT NULL,
    "rewardType" TEXT NOT NULL,
    "rewardAmount" BIGINT NOT NULL DEFAULT 0,
    "description" TEXT,
    CONSTRAINT "pk_season_rewards_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pk_battle_histories" (
    "id" TEXT NOT NULL,
    "battleId" TEXT NOT NULL,
    "seasonId" TEXT,
    "hostAId" TEXT NOT NULL,
    "hostBId" TEXT NOT NULL,
    "winnerId" TEXT,
    "hostAScore" BIGINT NOT NULL DEFAULT 0,
    "hostBScore" BIGINT NOT NULL DEFAULT 0,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pk_battle_histories_pkey" PRIMARY KEY ("id")
);

-- Agency Host Salary
CREATE TABLE "agency_hosts" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.2,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "agency_hosts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "host_earnings" (
    "id" TEXT NOT NULL,
    "agencyHostId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "EarningType" NOT NULL,
    "giftTxId" TEXT,
    "grossAmount" BIGINT NOT NULL DEFAULT 0,
    "commission" BIGINT NOT NULL DEFAULT 0,
    "netAmount" BIGINT NOT NULL DEFAULT 0,
    "periodKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "host_earnings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "host_payouts" (
    "id" TEXT NOT NULL,
    "agencyHostId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" BIGINT NOT NULL DEFAULT 0,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "note" TEXT,
    "periodKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "host_payouts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "host_salary_rules" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "minGiftValue" BIGINT NOT NULL DEFAULT 0,
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.2,
    "bonusRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "host_salary_rules_pkey" PRIMARY KEY ("id")
);

-- Anti-Fraud / Risk Engine
CREATE TABLE "user_devices" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "deviceInfo" TEXT,
    "platform" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_devices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_ip_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_ip_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "risk_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "eventType" "RiskEventType" NOT NULL,
    "scoreDelta" INTEGER NOT NULL DEFAULT 10,
    "action" "RiskActionType",
    "threshold" INTEGER NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "risk_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "risk_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ruleId" TEXT,
    "eventType" "RiskEventType" NOT NULL,
    "scoreDelta" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "risk_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "risk_scores" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "level" "RiskLevel" NOT NULL DEFAULT 'LOW',
    "isFlagged" BOOLEAN NOT NULL DEFAULT false,
    "flaggedAt" TIMESTAMP(3),
    "flaggedBy" TEXT,
    "clearedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "risk_scores_pkey" PRIMARY KEY ("id")
);

-- Room Moderator Tools
CREATE TABLE "room_moderators" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "addedBy" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "room_moderators_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "room_bans" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bannedBy" TEXT NOT NULL,
    "reason" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "room_bans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "room_mutes" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mutedBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "room_mutes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "room_keyword_filters" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "addedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "room_keyword_filters_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "room_moderation_logs" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "targetId" TEXT,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "room_moderation_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "room_slow_mode_settings" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "intervalSec" INTEGER NOT NULL DEFAULT 5,
    "giftOnly" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "room_slow_mode_settings_pkey" PRIMARY KEY ("id")
);

-- Verification Badge
CREATE TABLE "verification_badges" (
    "id" TEXT NOT NULL,
    "type" "BadgeType" NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "verification_badges_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_verification_badges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "grantedBy" TEXT,
    "grantedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_verification_badges_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "agency_verification_badges" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "grantedBy" TEXT,
    "grantedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "agency_verification_badges_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "room_verification_badges" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "grantedBy" TEXT,
    "grantedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "room_verification_badges_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
CREATE UNIQUE INDEX "host_profiles_userId_key" ON "host_profiles"("userId");
CREATE UNIQUE INDEX "host_level_rules_level_key" ON "host_level_rules"("level");
CREATE UNIQUE INDEX "host_daily_stats_hostProfileId_date_key" ON "host_daily_stats"("hostProfileId", "date");
CREATE UNIQUE INDEX "room_session_gift_stats_roomId_userId_sessionKey_key" ON "room_session_gift_stats"("roomId", "userId", "sessionKey");
CREATE UNIQUE INDEX "user_mission_progress_userId_missionId_periodKey_key" ON "user_mission_progress"("userId", "missionId", "periodKey");
CREATE UNIQUE INDEX "pk_season_participants_seasonId_userId_key" ON "pk_season_participants"("seasonId", "userId");
CREATE UNIQUE INDEX "agency_hosts_agencyId_userId_key" ON "agency_hosts"("agencyId", "userId");
CREATE UNIQUE INDEX "agency_hosts_userId_key" ON "agency_hosts"("userId");
CREATE UNIQUE INDEX "user_devices_userId_deviceId_key" ON "user_devices"("userId", "deviceId");
CREATE UNIQUE INDEX "risk_scores_userId_key" ON "risk_scores"("userId");
CREATE UNIQUE INDEX "room_moderators_roomId_userId_key" ON "room_moderators"("roomId", "userId");
CREATE UNIQUE INDEX "room_bans_roomId_userId_key" ON "room_bans"("roomId", "userId");
CREATE UNIQUE INDEX "room_mutes_roomId_userId_key" ON "room_mutes"("roomId", "userId");
CREATE UNIQUE INDEX "room_keyword_filters_roomId_keyword_key" ON "room_keyword_filters"("roomId", "keyword");
CREATE UNIQUE INDEX "room_slow_mode_settings_roomId_key" ON "room_slow_mode_settings"("roomId");
CREATE UNIQUE INDEX "verification_badges_type_key" ON "verification_badges"("type");
CREATE UNIQUE INDEX "user_verification_badges_userId_badgeId_key" ON "user_verification_badges"("userId", "badgeId");
CREATE UNIQUE INDEX "agency_verification_badges_agencyId_badgeId_key" ON "agency_verification_badges"("agencyId", "badgeId");
CREATE UNIQUE INDEX "room_verification_badges_roomId_badgeId_key" ON "room_verification_badges"("roomId", "badgeId");

-- Indexes
CREATE INDEX "room_supporter_snapshots_roomId_period_idx" ON "room_supporter_snapshots"("roomId", "period");
CREATE INDEX "room_supporter_snapshots_userId_idx" ON "room_supporter_snapshots"("userId");
CREATE INDEX "room_session_gift_stats_roomId_sessionKey_idx" ON "room_session_gift_stats"("roomId", "sessionKey");
CREATE INDEX "host_ranking_snapshots_period_rank_idx" ON "host_ranking_snapshots"("period", "rank");
CREATE INDEX "host_ranking_snapshots_userId_period_idx" ON "host_ranking_snapshots"("userId", "period");
CREATE INDEX "missions_period_isActive_idx" ON "missions"("period", "isActive");
CREATE INDEX "user_mission_progress_userId_periodKey_idx" ON "user_mission_progress"("userId", "periodKey");
CREATE INDEX "pk_seasons_status_idx" ON "pk_seasons"("status");
CREATE INDEX "pk_season_participants_seasonId_totalScore_idx" ON "pk_season_participants"("seasonId", "totalScore");
CREATE INDEX "pk_battle_histories_hostAId_idx" ON "pk_battle_histories"("hostAId");
CREATE INDEX "pk_battle_histories_hostBId_idx" ON "pk_battle_histories"("hostBId");
CREATE INDEX "pk_battle_histories_seasonId_idx" ON "pk_battle_histories"("seasonId");
CREATE INDEX "agency_hosts_agencyId_idx" ON "agency_hosts"("agencyId");
CREATE INDEX "host_earnings_agencyHostId_periodKey_idx" ON "host_earnings"("agencyHostId", "periodKey");
CREATE INDEX "host_earnings_userId_periodKey_idx" ON "host_earnings"("userId", "periodKey");
CREATE INDEX "host_payouts_agencyHostId_status_idx" ON "host_payouts"("agencyHostId", "status");
CREATE INDEX "host_payouts_userId_status_idx" ON "host_payouts"("userId", "status");
CREATE INDEX "host_salary_rules_agencyId_idx" ON "host_salary_rules"("agencyId");
CREATE INDEX "user_devices_deviceId_idx" ON "user_devices"("deviceId");
CREATE INDEX "user_ip_logs_userId_idx" ON "user_ip_logs"("userId");
CREATE INDEX "user_ip_logs_ipAddress_idx" ON "user_ip_logs"("ipAddress");
CREATE INDEX "risk_events_userId_idx" ON "risk_events"("userId");
CREATE INDEX "risk_events_eventType_idx" ON "risk_events"("eventType");
CREATE INDEX "room_moderation_logs_roomId_idx" ON "room_moderation_logs"("roomId");
CREATE INDEX "room_moderation_logs_actorId_idx" ON "room_moderation_logs"("actorId");
CREATE INDEX "user_verification_badges_userId_idx" ON "user_verification_badges"("userId");
CREATE INDEX "host_profiles_userId_idx" ON "host_profiles"("userId");

-- Foreign Keys
ALTER TABLE "room_supporter_snapshots" ADD CONSTRAINT "room_supporter_snapshots_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "voice_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "room_supporter_snapshots" ADD CONSTRAINT "room_supporter_snapshots_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "room_session_gift_stats" ADD CONSTRAINT "room_session_gift_stats_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "voice_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "room_session_gift_stats" ADD CONSTRAINT "room_session_gift_stats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "host_profiles" ADD CONSTRAINT "host_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "host_daily_stats" ADD CONSTRAINT "host_daily_stats_hostProfileId_fkey" FOREIGN KEY ("hostProfileId") REFERENCES "host_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "host_ranking_snapshots" ADD CONSTRAINT "host_ranking_snapshots_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_mission_progress" ADD CONSTRAINT "user_mission_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_mission_progress" ADD CONSTRAINT "user_mission_progress_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pk_season_participants" ADD CONSTRAINT "pk_season_participants_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "pk_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pk_season_participants" ADD CONSTRAINT "pk_season_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pk_season_rewards" ADD CONSTRAINT "pk_season_rewards_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "pk_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pk_battle_histories" ADD CONSTRAINT "pk_battle_histories_hostAId_fkey" FOREIGN KEY ("hostAId") REFERENCES "users"("id") ON UPDATE CASCADE;
ALTER TABLE "pk_battle_histories" ADD CONSTRAINT "pk_battle_histories_hostBId_fkey" FOREIGN KEY ("hostBId") REFERENCES "users"("id") ON UPDATE CASCADE;
ALTER TABLE "pk_battle_histories" ADD CONSTRAINT "pk_battle_histories_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "users"("id") ON UPDATE CASCADE;
ALTER TABLE "pk_battle_histories" ADD CONSTRAINT "pk_battle_histories_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "pk_seasons"("id") ON UPDATE CASCADE;
ALTER TABLE "agency_hosts" ADD CONSTRAINT "agency_hosts_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agency_hosts" ADD CONSTRAINT "agency_hosts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "host_earnings" ADD CONSTRAINT "host_earnings_agencyHostId_fkey" FOREIGN KEY ("agencyHostId") REFERENCES "agency_hosts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "host_earnings" ADD CONSTRAINT "host_earnings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "host_payouts" ADD CONSTRAINT "host_payouts_agencyHostId_fkey" FOREIGN KEY ("agencyHostId") REFERENCES "agency_hosts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "host_payouts" ADD CONSTRAINT "host_payouts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "host_salary_rules" ADD CONSTRAINT "host_salary_rules_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_devices" ADD CONSTRAINT "user_devices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_ip_logs" ADD CONSTRAINT "user_ip_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "risk_events" ADD CONSTRAINT "risk_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "risk_events" ADD CONSTRAINT "risk_events_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "risk_rules"("id") ON UPDATE CASCADE;
ALTER TABLE "risk_scores" ADD CONSTRAINT "risk_scores_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "room_moderators" ADD CONSTRAINT "room_moderators_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "voice_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "room_moderators" ADD CONSTRAINT "room_moderators_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "room_moderators" ADD CONSTRAINT "room_moderators_addedBy_fkey" FOREIGN KEY ("addedBy") REFERENCES "users"("id") ON UPDATE CASCADE;
ALTER TABLE "room_bans" ADD CONSTRAINT "room_bans_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "voice_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "room_bans" ADD CONSTRAINT "room_bans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "room_bans" ADD CONSTRAINT "room_bans_bannedBy_fkey" FOREIGN KEY ("bannedBy") REFERENCES "users"("id") ON UPDATE CASCADE;
ALTER TABLE "room_mutes" ADD CONSTRAINT "room_mutes_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "voice_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "room_mutes" ADD CONSTRAINT "room_mutes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "room_mutes" ADD CONSTRAINT "room_mutes_mutedBy_fkey" FOREIGN KEY ("mutedBy") REFERENCES "users"("id") ON UPDATE CASCADE;
ALTER TABLE "room_keyword_filters" ADD CONSTRAINT "room_keyword_filters_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "voice_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "room_moderation_logs" ADD CONSTRAINT "room_moderation_logs_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "voice_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "room_moderation_logs" ADD CONSTRAINT "room_moderation_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON UPDATE CASCADE;
ALTER TABLE "room_slow_mode_settings" ADD CONSTRAINT "room_slow_mode_settings_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "voice_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_verification_badges" ADD CONSTRAINT "user_verification_badges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_verification_badges" ADD CONSTRAINT "user_verification_badges_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "verification_badges"("id") ON UPDATE CASCADE;
ALTER TABLE "agency_verification_badges" ADD CONSTRAINT "agency_verification_badges_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agency_verification_badges" ADD CONSTRAINT "agency_verification_badges_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "verification_badges"("id") ON UPDATE CASCADE;
ALTER TABLE "room_verification_badges" ADD CONSTRAINT "room_verification_badges_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "voice_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "room_verification_badges" ADD CONSTRAINT "room_verification_badges_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "verification_badges"("id") ON UPDATE CASCADE;
