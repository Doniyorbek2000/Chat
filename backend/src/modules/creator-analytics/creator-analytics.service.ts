import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CreatorAnalyticsService {
  constructor(private prisma: PrismaService) {}

  private dateRange(from?: string, to?: string) {
    const end = to ? new Date(to) : new Date();
    const start = from ? new Date(from) : new Date(Date.now() - 30 * 86400000);
    return { gte: start, lte: end };
  }

  async getSummary(userId: string, from?: string, to?: string) {
    const range = this.dateRange(from, to);

    const [giftsReceived, newFollowers, hostProfile, hostEarnings, pkWins] = await Promise.all([
      this.prisma.giftTransaction.aggregate({
        where: { receiverId: userId, createdAt: range },
        _sum: { totalCoins: true },
        _count: true,
      }),
      this.prisma.follow.count({
        where: { followingId: userId, createdAt: range },
      }),
      this.prisma.hostProfile.findUnique({ where: { userId } }),
      this.prisma.hostEarning.aggregate({
        where: { userId },
        _sum: { netAmount: true },
      }),
      this.prisma.pkBattleHistory.count({
        where: { winnerId: userId, createdAt: range },
      }),
    ]);

    const rooms = await this.prisma.voiceRoom.findMany({
      where: { hostId: userId, createdAt: range },
      select: { viewerCount: true, totalGifts: true },
    });

    const avgViewers =
      rooms.length > 0
        ? Math.round(rooms.reduce((sum, r) => sum + r.viewerCount, 0) / rooms.length)
        : 0;

    return {
      giftsValue: (giftsReceived._sum.totalCoins ?? BigInt(0)).toString(),
      giftsCount: giftsReceived._count,
      newFollowers,
      totalLiveMinutes: hostProfile?.totalLiveMinutes ?? 0,
      totalFollowers: hostProfile?.totalFollowers ?? 0,
      estimatedEarnings: (hostEarnings._sum.netAmount ?? BigInt(0)).toString(),
      pkWins,
      avgViewers,
      roomsCount: rooms.length,
    };
  }

  async getGiftAnalytics(userId: string, from?: string, to?: string) {
    const range = this.dateRange(from, to);

    const gifts = await this.prisma.giftTransaction.findMany({
      where: { receiverId: userId, createdAt: range },
      select: { totalCoins: true, createdAt: true, senderId: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const byDate = new Map<string, bigint>();
    for (const g of gifts) {
      const key = g.createdAt.toISOString().split('T')[0];
      byDate.set(key, (byDate.get(key) ?? BigInt(0)) + g.totalCoins);
    }

    const dailyChart = Array.from(byDate.entries()).map(([date, value]) => ({
      date,
      value: value.toString(),
    }));

    // Top senders
    const senderMap = new Map<string, bigint>();
    for (const g of gifts) {
      senderMap.set(g.senderId, (senderMap.get(g.senderId) ?? BigInt(0)) + g.totalCoins);
    }

    const topSenderIds = [...senderMap.entries()]
      .sort((a, b) => (b[1] > a[1] ? 1 : -1))
      .slice(0, 10)
      .map(([id]) => id);

    const topSenders = await this.prisma.user.findMany({
      where: { id: { in: topSenderIds } },
      select: { id: true, displayName: true, avatar: true },
    });

    return {
      dailyChart,
      topSenders: topSenders.map((u) => ({
        ...u,
        totalGiftValue: (senderMap.get(u.id) ?? BigInt(0)).toString(),
      })),
    };
  }

  async getTopSupporters(userId: string, limit = 20) {
    const stats = await this.prisma.giftTransaction.groupBy({
      by: ['senderId'],
      where: {
        room: { hostId: userId },
      },
      _sum: { totalCoins: true },
      _count: true,
      orderBy: { _sum: { totalCoins: 'desc' } },
      take: limit,
    });

    const userIds = stats.map((s) => s.senderId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, displayName: true, avatar: true, uid: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    return stats.map((s) => ({
      ...userMap.get(s.senderId),
      totalGiftValue: (s._sum.totalCoins ?? BigInt(0)).toString(),
      giftCount: s._count,
    }));
  }

  async getRoomAnalytics(userId: string, from?: string, to?: string) {
    const range = this.dateRange(from, to);

    const rooms = await this.prisma.voiceRoom.findMany({
      where: { hostId: userId, createdAt: range },
      select: {
        id: true,
        title: true,
        viewerCount: true,
        totalGifts: true,
        createdAt: true,
        _count: { select: { members: true } },
      },
    });

    return rooms.map((r) => ({
      ...r,
      totalGifts: r.totalGifts.toString(),
    }));
  }

  async getFollowerAnalytics(userId: string, from?: string, to?: string) {
    const range = this.dateRange(from, to);

    const follows = await this.prisma.follow.findMany({
      where: { followingId: userId, createdAt: range },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const byDate = new Map<string, number>();
    for (const f of follows) {
      const key = f.createdAt.toISOString().split('T')[0];
      byDate.set(key, (byDate.get(key) ?? 0) + 1);
    }

    return Array.from(byDate.entries()).map(([date, count]) => ({ date, count }));
  }
}
