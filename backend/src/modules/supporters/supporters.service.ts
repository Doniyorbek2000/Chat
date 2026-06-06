import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

const SESSION_KEY = (roomId: string) => `supporters:${roomId}:session`;
const TOP3_KEY = (roomId: string) => `supporters:${roomId}:top3`;
const CACHE_TTL = 30;

@Injectable()
export class SupportersService {
  constructor(
    private prisma: PrismaService,
    @InjectRedis() private redis: Redis,
  ) {}

  private todayKey(): string {
    return new Date().toISOString().split('T')[0];
  }

  async recordGift(roomId: string, userId: string, giftValue: bigint) {
    const sessionKey = this.todayKey();

    // Upsert session gift stat in DB
    await this.prisma.roomSessionGiftStat.upsert({
      where: { roomId_userId_sessionKey: { roomId, userId, sessionKey } },
      update: {
        giftValue: { increment: giftValue },
        giftCount: { increment: 1 },
      },
      create: { roomId, userId, sessionKey, giftValue, giftCount: 1 },
    });

    // Update Redis sorted set
    await this.redis.zincrby(SESSION_KEY(roomId), Number(giftValue), userId);
    await this.redis.expire(SESSION_KEY(roomId), 86400);

    // Check and emit top3 change
    await this.checkTop3Change(roomId);
  }

  private async checkTop3Change(roomId: string) {
    await this.redis.del(TOP3_KEY(roomId));
  }

  async getRoomSupporters(
    roomId: string,
    period: string,
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;

    if (period === 'session' || period === 'daily') {
      const sessionKey = this.todayKey();
      const [data, total] = await Promise.all([
        this.prisma.roomSessionGiftStat.findMany({
          where: { roomId, sessionKey },
          orderBy: { giftValue: 'desc' },
          skip,
          take: limit,
          include: {
            user: { select: { id: true, displayName: true, avatar: true, uid: true } },
          },
        }),
        this.prisma.roomSessionGiftStat.count({ where: { roomId, sessionKey } }),
      ]);

      return {
        data: data.map((s, i) => ({
          rank: skip + i + 1,
          userId: s.userId,
          displayName: s.user.displayName,
          avatar: s.user.avatar,
          giftValue: s.giftValue.toString(),
          giftCount: s.giftCount,
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }

    // weekly/monthly/all from snapshots
    const [data, total] = await Promise.all([
      this.prisma.roomSupporterSnapshot.findMany({
        where: { roomId, period },
        orderBy: { giftValue: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, displayName: true, avatar: true, uid: true } },
        },
      }),
      this.prisma.roomSupporterSnapshot.count({ where: { roomId, period } }),
    ]);

    return {
      data: data.map((s) => ({
        rank: s.rank,
        userId: s.userId,
        displayName: s.user.displayName,
        avatar: s.user.avatar,
        giftValue: s.giftValue.toString(),
        giftCount: s.giftCount,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getTop3(roomId: string) {
    const cached = await this.redis.get(TOP3_KEY(roomId));
    if (cached) return JSON.parse(cached);

    const sessionKey = this.todayKey();
    const top3 = await this.prisma.roomSessionGiftStat.findMany({
      where: { roomId, sessionKey },
      orderBy: { giftValue: 'desc' },
      take: 3,
      include: {
        user: { select: { id: true, displayName: true, avatar: true, uid: true } },
      },
    });

    const result = top3.map((s, i) => ({
      rank: i + 1,
      userId: s.userId,
      displayName: s.user.displayName,
      avatar: s.user.avatar,
      giftValue: s.giftValue.toString(),
    }));

    await this.redis.set(TOP3_KEY(roomId), JSON.stringify(result), 'EX', CACHE_TTL);
    return result;
  }

  async getMyStats(userId: string) {
    const stats = await this.prisma.roomSessionGiftStat.aggregate({
      where: { userId },
      _sum: { giftValue: true, giftCount: true },
    });

    const topRooms = await this.prisma.roomSessionGiftStat.groupBy({
      by: ['roomId'],
      where: { userId },
      _sum: { giftValue: true },
      orderBy: { _sum: { giftValue: 'desc' } },
      take: 5,
    });

    return {
      totalGiftValue: (stats._sum.giftValue || BigInt(0)).toString(),
      totalGiftCount: stats._sum.giftCount || 0,
      topRooms: topRooms.map((r) => ({
        roomId: r.roomId,
        giftValue: (r._sum.giftValue || BigInt(0)).toString(),
      })),
    };
  }

  async snapshotRoom(roomId: string) {
    const sessionKey = this.todayKey();
    const stats = await this.prisma.roomSessionGiftStat.findMany({
      where: { roomId, sessionKey },
      orderBy: { giftValue: 'desc' },
    });

    if (!stats.length) return;

    // Save weekly/monthly/all snapshots
    for (const [i, s] of stats.entries()) {
      for (const period of ['weekly', 'monthly', 'all']) {
        await this.prisma.roomSupporterSnapshot.upsert({
          where: {
            id: `${s.roomId}-${s.userId}-${period}`,
          },
          update: {
            giftValue: { increment: s.giftValue },
            giftCount: { increment: s.giftCount },
            rank: i + 1,
            snapshotAt: new Date(),
          },
          create: {
            id: `${s.roomId}-${s.userId}-${period}`,
            roomId: s.roomId,
            userId: s.userId,
            period,
            giftValue: s.giftValue,
            giftCount: s.giftCount,
            rank: i + 1,
          },
        });
      }
    }

    await this.redis.del(SESSION_KEY(roomId));
    await this.redis.del(TOP3_KEY(roomId));
  }
}
