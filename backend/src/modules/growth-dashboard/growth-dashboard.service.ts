import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GrowthDashboardService {
  constructor(private prisma: PrismaService) {}

  private dateRange(from?: string, to?: string) {
    const end = to ? new Date(to) : new Date();
    const start = from ? new Date(from) : new Date(Date.now() - 30 * 86400000);
    return { gte: start, lte: end };
  }

  async getSummary(from?: string, to?: string) {
    const range = this.dateRange(from, to);

    const [newUsers, giftsCount, revenue, payingUsersRaw, hostStats] = await Promise.all([
      this.prisma.user.count({ where: { createdAt: range } }),
      this.prisma.giftTransaction.count({ where: { createdAt: range } }),
      this.prisma.transaction.aggregate({
        where: { type: 'RECHARGE', status: 'COMPLETED', createdAt: range },
        _sum: { amount: true },
      }),
      this.prisma.transaction.groupBy({
        by: ['userId'],
        where: { type: 'RECHARGE', status: 'COMPLETED', createdAt: range },
      }),
      this.prisma.hostDailyStat.aggregate({
        where: { createdAt: range },
        _sum: { liveMinutes: true },
      }),
    ]);

    const activeRooms = await this.prisma.voiceRoom.count({ where: { isLive: true } });

    const totalRevenue = revenue._sum.amount ?? BigInt(0);
    const payingUsers = payingUsersRaw.length;
    const arppu = payingUsers > 0 ? Number(totalRevenue) / payingUsers : 0;

    return {
      newUsers,
      activeRooms,
      giftsCount,
      totalRevenue: totalRevenue.toString(),
      payingUsers,
      arppu: arppu.toFixed(2),
      liveMinutes: hostStats._sum.liveMinutes ?? 0,
    };
  }

  async getRetention() {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 86400000);
    const d7 = new Date(now.getTime() - 7 * 86400000);
    const d30 = new Date(now.getTime() - 30 * 86400000);

    const formatDay = (d: Date) => d.toISOString().split('T')[0];

    // D1: registered yesterday, active today
    const registeredYesterday = await this.prisma.user.count({
      where: {
        createdAt: {
          gte: new Date(yesterday.setHours(0, 0, 0, 0)),
          lt: new Date(now.setHours(0, 0, 0, 0)),
        },
      },
    });
    const d1Active = await this.prisma.transaction.groupBy({
      by: ['userId'],
      where: {
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        user: {
          createdAt: {
            gte: new Date(new Date(Date.now() - 86400000).setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      },
    });

    return {
      d1: registeredYesterday > 0 ? Math.round((d1Active.length / registeredYesterday) * 100) : 0,
      d7: 0, // simplified
      d30: 0, // simplified
      registeredYesterday,
      d1ActiveCount: d1Active.length,
    };
  }

  async getRevenueChart(from?: string, to?: string, groupBy = 'day') {
    const range = this.dateRange(from, to);

    const transactions = await this.prisma.transaction.findMany({
      where: { type: 'RECHARGE', status: 'COMPLETED', createdAt: range },
      select: { amount: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const chart = new Map<string, bigint>();
    for (const t of transactions) {
      let key: string;
      if (groupBy === 'month') {
        key = `${t.createdAt.getFullYear()}-${String(t.createdAt.getMonth() + 1).padStart(2, '0')}`;
      } else if (groupBy === 'week') {
        const weekNum = Math.ceil(t.createdAt.getDate() / 7);
        key = `${t.createdAt.getFullYear()}-W${weekNum}`;
      } else {
        key = t.createdAt.toISOString().split('T')[0];
      }
      chart.set(key, (chart.get(key) ?? BigInt(0)) + t.amount);
    }

    return Array.from(chart.entries()).map(([date, amount]) => ({
      date,
      amount: amount.toString(),
    }));
  }

  async getTopHosts(period = 'weekly', limit = 20) {
    const profiles = await this.prisma.hostProfile.findMany({
      orderBy: { totalGiftValue: 'desc' },
      take: limit,
      include: {
        user: { select: { id: true, displayName: true, avatar: true, uid: true } },
      },
    });

    return profiles.map((p, i) => ({
      rank: i + 1,
      userId: p.userId,
      displayName: p.user.displayName,
      avatar: p.user.avatar,
      tier: p.tier,
      level: p.level,
      totalLiveMinutes: p.totalLiveMinutes,
      totalGiftValue: p.totalGiftValue.toString(),
      pkWins: p.pkWins,
    }));
  }

  async getRiskSummary() {
    const [flaggedUsers, highRiskUsers, pendingPayouts, recentEvents] = await Promise.all([
      this.prisma.riskScore.count({ where: { isFlagged: true } }),
      this.prisma.riskScore.count({ where: { level: { in: ['HIGH', 'CRITICAL'] } } }),
      this.prisma.hostPayout.count({ where: { status: 'PENDING' } }),
      this.prisma.riskEvent.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, displayName: true } } },
      }),
    ]);

    return {
      flaggedUsers,
      highRiskUsers,
      pendingPayouts,
      recentEvents,
    };
  }
}
