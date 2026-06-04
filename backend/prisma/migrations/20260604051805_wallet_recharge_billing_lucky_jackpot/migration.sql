-- CreateEnum
CREATE TYPE "RechargeProductType" AS ENUM ('COINS', 'DIAMONDS', 'FIRST_RECHARGE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "GiftCategory" ADD VALUE 'LUCKY_FRUIT';
ALTER TYPE "GiftCategory" ADD VALUE 'RELATIONSHIP';
ALTER TYPE "GiftCategory" ADD VALUE 'ARISTOCRACY';
ALTER TYPE "GiftCategory" ADD VALUE 'CUSTOMIZE';

-- CreateTable
CREATE TABLE "recharge_products" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "RechargeProductType" NOT NULL,
    "baseAmount" BIGINT NOT NULL,
    "bonusAmount" BIGINT NOT NULL DEFAULT 0,
    "priceUzs" INTEGER NOT NULL,
    "isFirstRechargeOnly" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recharge_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_first_recharges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "productId" TEXT NOT NULL,
    "coinsGranted" BIGINT NOT NULL,
    "bonusGranted" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "user_first_recharges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_daily_recharge_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "totalCoins" BIGINT NOT NULL DEFAULT 0,
    "claimedTiers" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_daily_recharge_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lucky_gift_configs" (
    "id" TEXT NOT NULL,
    "giftId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "minMultiplier" INTEGER NOT NULL DEFAULT 1,
    "maxMultiplier" INTEGER NOT NULL DEFAULT 10,
    "jackpotChanceBps" INTEGER NOT NULL DEFAULT 100,
    "poolContributionBps" INTEGER NOT NULL DEFAULT 500,
    "houseEdgeBps" INTEGER NOT NULL DEFAULT 300,
    "maxWinCoins" BIGINT NOT NULL DEFAULT 1000000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lucky_gift_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jackpot_pool" (
    "id" TEXT NOT NULL,
    "totalCoins" BIGINT NOT NULL DEFAULT 0,
    "lastWonAt" TIMESTAMP(3),
    "lastWinnerId" TEXT,
    "lastWonCoins" BIGINT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jackpot_pool_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "recharge_products_productId_key" ON "recharge_products"("productId");

-- CreateIndex
CREATE INDEX "recharge_products_type_idx" ON "recharge_products"("type");

-- CreateIndex
CREATE INDEX "recharge_products_isActive_idx" ON "recharge_products"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "user_first_recharges_userId_key" ON "user_first_recharges"("userId");

-- CreateIndex
CREATE INDEX "user_daily_recharge_progress_userId_idx" ON "user_daily_recharge_progress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_daily_recharge_progress_userId_date_key" ON "user_daily_recharge_progress"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "lucky_gift_configs_giftId_key" ON "lucky_gift_configs"("giftId");

-- AddForeignKey
ALTER TABLE "user_first_recharges" ADD CONSTRAINT "user_first_recharges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_daily_recharge_progress" ADD CONSTRAINT "user_daily_recharge_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lucky_gift_configs" ADD CONSTRAINT "lucky_gift_configs_giftId_fkey" FOREIGN KEY ("giftId") REFERENCES "gifts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
