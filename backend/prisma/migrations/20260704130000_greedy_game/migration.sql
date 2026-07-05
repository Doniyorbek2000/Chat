-- Greedy game: betting rounds with weighted random results

CREATE TYPE "GreedyRoundStatus" AS ENUM ('BETTING', 'SETTLED');

CREATE TABLE "greedy_rounds" (
    "id" TEXT NOT NULL,
    "roundNumber" SERIAL NOT NULL,
    "status" "GreedyRoundStatus" NOT NULL DEFAULT 'BETTING',
    "resultItem" TEXT,
    "totalBet" BIGINT NOT NULL DEFAULT 0,
    "totalPayout" BIGINT NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "settledAt" TIMESTAMP(3),

    CONSTRAINT "greedy_rounds_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "greedy_bets" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "payout" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "greedy_bets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "greedy_rounds_roundNumber_key" ON "greedy_rounds"("roundNumber");
CREATE INDEX "greedy_rounds_status_idx" ON "greedy_rounds"("status");
CREATE INDEX "greedy_rounds_settledAt_idx" ON "greedy_rounds"("settledAt");
CREATE INDEX "greedy_bets_roundId_idx" ON "greedy_bets"("roundId");
CREATE INDEX "greedy_bets_userId_createdAt_idx" ON "greedy_bets"("userId", "createdAt");

ALTER TABLE "greedy_bets" ADD CONSTRAINT "greedy_bets_roundId_fkey"
    FOREIGN KEY ("roundId") REFERENCES "greedy_rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "greedy_bets" ADD CONSTRAINT "greedy_bets_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
