import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { ConfigService } from '@nestjs/config';
import * as Redis from 'ioredis';
import * as dayjs from 'dayjs';

const DAILY_REWARDS = [
  { day: 1, coins: 100, diamonds: 0 },
  { day: 2, coins: 150, diamonds: 0 },
  { day: 3, coins: 200, diamonds: 5 },
  { day: 4, coins: 300, diamonds: 0 },
  { day: 5, coins: 400, diamonds: 10 },
  { day: 6, coins: 500, diamonds: 0 },
  { day: 7, coins: 1000, diamonds: 50 },
];

@Injectable()
export class RewardsService {
  private redis: Redis.Redis;

  constructor(
    private prisma: PrismaService,
    private wallet: WalletService,
    private config: ConfigService,
  ) {
    this.redis = new Redis.Redis(
      this.config.get<string>('redis.url') || 'redis://localhost:6379',
    );
  }

  getDailyRewardSchedule() {
    return DAILY_REWARDS;
  }

  async getDailyRewardStatus(userId: string) {
    const today = dayjs().format('YYYY-MM-DD');
    const claimedKey = `daily_reward:${userId}:${today}`;
    const streakKey = `daily_streak:${userId}`;
    const lastClaimKey = `daily_last:${userId}`;

    const [claimedToday, streak, lastClaim] = await Promise.all([
      this.redis.get(claimedKey),
      this.redis.get(streakKey),
      this.redis.get(lastClaimKey),
    ]);

    // Check if streak is still valid (must claim every day)
    const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
    let currentStreak = parseInt(streak || '0');
    if (lastClaim && lastClaim !== today && lastClaim !== yesterday) {
      currentStreak = 0; // Streak broken
    }

    const dayInCycle = (currentStreak % 7) + 1;

    const rewards = DAILY_REWARDS.map((r) => ({
      ...r,
      claimed: r.day <= (claimedToday ? dayInCycle : dayInCycle - 1),
      isCurrent: r.day === dayInCycle,
    }));

    return {
      canClaim: !claimedToday,
      currentDay: dayInCycle,
      streakDays: currentStreak,
      rewards,
      todayReward: DAILY_REWARDS[dayInCycle - 1],
    };
  }

  async claimDailyReward(userId: string) {
    const today = dayjs().format('YYYY-MM-DD');
    const claimedKey = `daily_reward:${userId}:${today}`;

    const alreadyClaimed = await this.redis.get(claimedKey);
    if (alreadyClaimed)
      throw new BadRequestException('Daily reward already claimed today');

    const streakKey = `daily_streak:${userId}`;
    const lastClaimKey = `daily_last:${userId}`;
    const lastClaim = await this.redis.get(lastClaimKey);
    const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');

    let streak = parseInt((await this.redis.get(streakKey)) || '0');
    if (!lastClaim || lastClaim === yesterday) {
      streak += 1;
    } else if (lastClaim !== today) {
      streak = 1; // Reset streak
    }

    const dayInCycle = ((streak - 1) % 7) + 1;
    const reward = DAILY_REWARDS[dayInCycle - 1];

    // Mark as claimed (expires at midnight)
    const secondsUntilMidnight = dayjs().endOf('day').diff(dayjs(), 'second');
    await Promise.all([
      this.redis.setex(claimedKey, secondsUntilMidnight, '1'),
      this.redis.set(streakKey, streak.toString()),
      this.redis.set(lastClaimKey, today),
    ]);

    // Give rewards
    if (reward.coins > 0) {
      await this.wallet.addCoins(
        userId,
        reward.coins,
        `Daily reward day ${dayInCycle}`,
      );
    }
    if (reward.diamonds > 0) {
      await this.wallet.addDiamonds(
        userId,
        reward.diamonds,
        `Daily reward day ${dayInCycle}`,
      );
    }

    return {
      reward,
      streak,
      day: dayInCycle,
      message: `Claimed! +${reward.coins} coins${reward.diamonds > 0 ? ` +${reward.diamonds} diamonds` : ''}`,
    };
  }

  async getStreakInfo(userId: string) {
    const streakKey = `daily_streak:${userId}`;
    const streak = parseInt((await this.redis.get(streakKey)) || '0');
    return { streakDays: streak, nextMilestone: 7 - (streak % 7) };
  }
}
