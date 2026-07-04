-- Add email/password and social (Facebook, Telegram) auth fields to users

ALTER TABLE "users" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "passwordHash" TEXT;
ALTER TABLE "users" ADD COLUMN "facebookId" TEXT;
ALTER TABLE "users" ADD COLUMN "telegramId" TEXT;

-- Existing social/phone accounts have verified contact info
UPDATE "users" SET "emailVerified" = true WHERE "email" IS NOT NULL;

CREATE UNIQUE INDEX "users_facebookId_key" ON "users"("facebookId");
CREATE UNIQUE INDEX "users_telegramId_key" ON "users"("telegramId");
