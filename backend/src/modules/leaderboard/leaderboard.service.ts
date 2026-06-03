import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { CoupleStatus } from '@prisma/client';

type Period = 'daily' | 'weekly' | 'monthly';

@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger(LeaderboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  private getDateRangeStart(period: Period): Date {
    const now = new Date();
    switch (period) {
      case 'daily':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case 'weekly': {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(now.getFullYear(), now.getMonth(), diff);
      }
      case 'monthly':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      default:
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
  }

  private buildRedisKey(type: string, period: Period): string {
    return `leaderboard:${type}:${period}`;
  }

  /**
   * Get top users by diamonds received (gifts received) for the period.
   */
  async getUserRanking(period: Period, page = 1, limit = 20) {
    const key = this.buildRedisKey('users', period);
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    const cached = await this.redis.zrevrange(key, start, end, 'WITHSCORES');
    if (cached.length > 0) {
      const entries = this.parseZRevrangeWithScores(cached);
      const userIds = entries.map((e) => e.member);
      const users = await this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          uid: true,
          displayName: true,
          avatar: true,
          isVip: true,
          vipLevel: true,
          level: true,
        },
      });
      const userMap = new Map(users.map((u) => [u.id, u]));
      const total = await this.redis.zcard(key);

      return {
        data: entries.map((e, i) => ({
          rank: start + i + 1,
          score: e.score,
          user: userMap.get(e.member),
        })),
        meta: { total, page, limit, pages: Math.ceil(total / limit) },
      };
    }

    // Fallback to Prisma
    const dateFrom = this.getDateRangeStart(period);
    const [results, total] = await Promise.all([
      this.prisma.giftTransaction.groupBy({
        by: ['receiverId'],
        _sum: { totalDiamonds: true },
        where: { createdAt: { gte: dateFrom } },
        orderBy: { _sum: { totalDiamonds: 'desc' } },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.giftTransaction
        .groupBy({
          by: ['receiverId'],
          _sum: { totalDiamonds: true },
          where: { createdAt: { gte: dateFrom } },
        })
        .then((r) => r.length),
    ]);

    const userIds = results.map((r) => r.receiverId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        uid: true,
        displayName: true,
        avatar: true,
        isVip: true,
        vipLevel: true,
        level: true,
      },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return {
      data: results.map((r, i) => ({
        rank: (page - 1) * limit + i + 1,
        score: Number(r._sum.totalDiamonds || 0),
        user: userMap.get(r.receiverId),
      })),
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get top rooms by total gifts received.
   */
  async getRoomRanking(period: Period, page = 1, limit = 20) {
    const key = this.buildRedisKey('rooms', period);
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    const cached = await this.redis.zrevrange(key, start, end, 'WITHSCORES');
    if (cached.length > 0) {
      const entries = this.parseZRevrangeWithScores(cached);
      const roomIds = entries.map((e) => e.member);
      const rooms = await this.prisma.voiceRoom.findMany({
        where: { id: { in: roomIds } },
        select: {
          id: true,
          title: true,
          coverImage: true,
          hostId: true,
          host: {
            select: { id: true, uid: true, displayName: true, avatar: true },
          },
        },
      });
      const roomMap = new Map(rooms.map((r) => [r.id, r]));
      const total = await this.redis.zcard(key);

      return {
        data: entries.map((e, i) => ({
          rank: start + i + 1,
          score: e.score,
          room: roomMap.get(e.member),
        })),
        meta: { total, page, limit, pages: Math.ceil(total / limit) },
      };
    }

    // Fallback to Prisma
    const dateFrom = this.getDateRangeStart(period);
    const [results, total] = await Promise.all([
      this.prisma.giftTransaction.groupBy({
        by: ['roomId'],
        _sum: { totalCoins: true },
        where: { createdAt: { gte: dateFrom }, roomId: { not: null } },
        orderBy: { _sum: { totalCoins: 'desc' } },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.giftTransaction
        .groupBy({
          by: ['roomId'],
          _sum: { totalCoins: true },
          where: { createdAt: { gte: dateFrom }, roomId: { not: null } },
        })
        .then((r) => r.length),
    ]);

    const roomIds = results.map((r) => r.roomId).filter(Boolean) as string[];
    const rooms = await this.prisma.voiceRoom.findMany({
      where: { id: { in: roomIds } },
      select: {
        id: true,
        title: true,
        coverImage: true,
        hostId: true,
        host: {
          select: { id: true, uid: true, displayName: true, avatar: true },
        },
      },
    });
    const roomMap = new Map(rooms.map((r) => [r.id, r]));

    return {
      data: results.map((r, i) => ({
        rank: (page - 1) * limit + i + 1,
        score: Number(r._sum.totalCoins || 0),
        room: roomMap.get(r.roomId!),
      })),
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get top families by treasury/XP.
   */
  async getFamilyRanking(period: Period, page = 1, limit = 20) {
    const key = this.buildRedisKey('families', period);
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    const cached = await this.redis.zrevrange(key, start, end, 'WITHSCORES');
    if (cached.length > 0) {
      const entries = this.parseZRevrangeWithScores(cached);
      const familyIds = entries.map((e) => e.member);
      const families = await this.prisma.family.findMany({
        where: { id: { in: familyIds } },
        select: {
          id: true,
          name: true,
          tag: true,
          avatar: true,
          level: true,
          treasury: true,
          _count: { select: { members: true } },
        },
      });
      const familyMap = new Map(families.map((f) => [f.id, f]));
      const total = await this.redis.zcard(key);

      return {
        data: entries.map((e, i) => ({
          rank: start + i + 1,
          score: e.score,
          family: familyMap.get(e.member),
        })),
        meta: { total, page, limit, pages: Math.ceil(total / limit) },
      };
    }

    // Fallback to Prisma
    const [families, total] = await Promise.all([
      this.prisma.family.findMany({
        orderBy: [{ level: 'desc' }, { xp: 'desc' }, { treasury: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          tag: true,
          avatar: true,
          level: true,
          xp: true,
          treasury: true,
          owner: {
            select: { id: true, uid: true, displayName: true, avatar: true },
          },
          _count: { select: { members: true } },
        },
      }),
      this.prisma.family.count(),
    ]);

    return {
      data: families.map((f, i) => ({
        rank: (page - 1) * limit + i + 1,
        score: Number(f.treasury),
        family: f,
      })),
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get top couples by combined level/XP.
   */
  async getCoupleRanking(period: Period, page = 1, limit = 20) {
    const key = this.buildRedisKey('couples', period);
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    const cached = await this.redis.zrevrange(key, start, end, 'WITHSCORES');
    if (cached.length > 0) {
      const entries = this.parseZRevrangeWithScores(cached);
      const coupleIds = entries.map((e) => e.member);
      const couples = await this.prisma.couple.findMany({
        where: { id: { in: coupleIds } },
        include: {
          user1: {
            select: { id: true, uid: true, displayName: true, avatar: true },
          },
          user2: {
            select: { id: true, uid: true, displayName: true, avatar: true },
          },
        },
      });
      const coupleMap = new Map(couples.map((c) => [c.id, c]));
      const total = await this.redis.zcard(key);

      return {
        data: entries.map((e, i) => ({
          rank: start + i + 1,
          score: e.score,
          couple: coupleMap.get(e.member),
        })),
        meta: { total, page, limit, pages: Math.ceil(total / limit) },
      };
    }

    // Fallback to Prisma
    const [couples, total] = await Promise.all([
      this.prisma.couple.findMany({
        where: { status: CoupleStatus.ACTIVE },
        orderBy: [{ level: 'desc' }, { xp: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user1: {
            select: {
              id: true,
              uid: true,
              displayName: true,
              avatar: true,
              isVip: true,
            },
          },
          user2: {
            select: {
              id: true,
              uid: true,
              displayName: true,
              avatar: true,
              isVip: true,
            },
          },
        },
      }),
      this.prisma.couple.count({ where: { status: CoupleStatus.ACTIVE } }),
    ]);

    return {
      data: couples.map((c, i) => ({
        rank: (page - 1) * limit + i + 1,
        score: Number(c.xp),
        couple: c,
        daysTogether: Math.floor(
          (Date.now() - c.createdAt.getTime()) / (1000 * 60 * 60 * 24),
        ),
      })),
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get top gift senders by total coins spent.
   */
  async getGiftRanking(period: Period, page = 1, limit = 20) {
    const key = this.buildRedisKey('gifters', period);
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    const cached = await this.redis.zrevrange(key, start, end, 'WITHSCORES');
    if (cached.length > 0) {
      const entries = this.parseZRevrangeWithScores(cached);
      const userIds = entries.map((e) => e.member);
      const users = await this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          uid: true,
          displayName: true,
          avatar: true,
          isVip: true,
          vipLevel: true,
          level: true,
        },
      });
      const userMap = new Map(users.map((u) => [u.id, u]));
      const total = await this.redis.zcard(key);

      return {
        data: entries.map((e, i) => ({
          rank: start + i + 1,
          score: e.score,
          user: userMap.get(e.member),
        })),
        meta: { total, page, limit, pages: Math.ceil(total / limit) },
      };
    }

    const dateFrom = this.getDateRangeStart(period);
    const [results, total] = await Promise.all([
      this.prisma.giftTransaction.groupBy({
        by: ['senderId'],
        _sum: { totalCoins: true },
        where: { createdAt: { gte: dateFrom } },
        orderBy: { _sum: { totalCoins: 'desc' } },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.giftTransaction
        .groupBy({
          by: ['senderId'],
          _sum: { totalCoins: true },
          where: { createdAt: { gte: dateFrom } },
        })
        .then((r) => r.length),
    ]);

    const userIds = results.map((r) => r.senderId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        uid: true,
        displayName: true,
        avatar: true,
        isVip: true,
        vipLevel: true,
        level: true,
      },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return {
      data: results.map((r, i) => ({
        rank: (page - 1) * limit + i + 1,
        score: Number(r._sum.totalCoins || 0),
        user: userMap.get(r.senderId),
      })),
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get top rechargers by total recharge amount.
   */
  async getRechargeRanking(period: Period, page = 1, limit = 20) {
    const key = this.buildRedisKey('recharge', period);
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    const cached = await this.redis.zrevrange(key, start, end, 'WITHSCORES');
    if (cached.length > 0) {
      const entries = this.parseZRevrangeWithScores(cached);
      const userIds = entries.map((e) => e.member);
      const users = await this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          uid: true,
          displayName: true,
          avatar: true,
          isVip: true,
          vipLevel: true,
        },
      });
      const userMap = new Map(users.map((u) => [u.id, u]));
      const total = await this.redis.zcard(key);

      return {
        data: entries.map((e, i) => ({
          rank: start + i + 1,
          score: e.score,
          user: userMap.get(e.member),
        })),
        meta: { total, page, limit, pages: Math.ceil(total / limit) },
      };
    }

    const dateFrom = this.getDateRangeStart(period);
    const [results, total] = await Promise.all([
      this.prisma.wallet.findMany({
        where: {
          user: {
            transactions: {
              some: { type: 'RECHARGE', createdAt: { gte: dateFrom } },
            },
          },
        },
        orderBy: { totalRecharge: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          userId: true,
          totalRecharge: true,
          user: {
            select: {
              id: true,
              uid: true,
              displayName: true,
              avatar: true,
              isVip: true,
              vipLevel: true,
            },
          },
        },
      }),
      this.prisma.wallet.count(),
    ]);

    return {
      data: results.map((r, i) => ({
        rank: (page - 1) * limit + i + 1,
        score: Number(r.totalRecharge),
        user: r.user,
      })),
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get a specific user's rank in a given leaderboard type.
   */
  async getUserRank(userId: string, type: string, period: Period) {
    const key = this.buildRedisKey(type, period);

    // Try Redis first
    const rank = await this.redis.zrevrank(key, userId);
    if (rank !== null) {
      const score = await this.redis.zscore(key, userId);
      return { rank: rank + 1, score: score ? parseFloat(score) : 0, userId };
    }

    // Fallback: compute from DB
    const dateFrom = this.getDateRangeStart(period);

    if (type === 'users') {
      const userTotal = await this.prisma.giftTransaction.aggregate({
        _sum: { totalDiamonds: true },
        where: { receiverId: userId, createdAt: { gte: dateFrom } },
      });
      const myScore = Number(userTotal._sum.totalDiamonds || 0);

      const higherCount = await this.prisma.giftTransaction.groupBy({
        by: ['receiverId'],
        _sum: { totalDiamonds: true },
        where: { createdAt: { gte: dateFrom } },
        having: { totalDiamonds: { _sum: { gt: myScore } } },
      });

      return { rank: higherCount.length + 1, score: myScore, userId };
    }

    if (type === 'gifters') {
      const userTotal = await this.prisma.giftTransaction.aggregate({
        _sum: { totalCoins: true },
        where: { senderId: userId, createdAt: { gte: dateFrom } },
      });
      const myScore = Number(userTotal._sum.totalCoins || 0);

      const higherCount = await this.prisma.giftTransaction.groupBy({
        by: ['senderId'],
        _sum: { totalCoins: true },
        where: { createdAt: { gte: dateFrom } },
        having: { totalCoins: { _sum: { gt: myScore } } },
      });

      return { rank: higherCount.length + 1, score: myScore, userId };
    }

    return { rank: null, score: 0, userId, message: 'Not ranked yet' };
  }

  /**
   * Update a user's score in Redis sorted set (called from gift/recharge events).
   */
  async updateScore(type: string, memberId: string, score: number) {
    const periods: Period[] = ['daily', 'weekly', 'monthly'];
    const ttlMap: Record<Period, number> = {
      daily: 86400,
      weekly: 604800,
      monthly: 2592000,
    };

    for (const period of periods) {
      const key = this.buildRedisKey(type, period);
      await this.redis.zincrby(key, score, memberId);
      await this.redis.expire(key, ttlMap[period]);
    }
  }

  private parseZRevrangeWithScores(
    raw: string[],
  ): { member: string; score: number }[] {
    const result: { member: string; score: number }[] = [];
    for (let i = 0; i < raw.length; i += 2) {
      result.push({ member: raw[i], score: parseFloat(raw[i + 1]) });
    }
    return result;
  }
}
