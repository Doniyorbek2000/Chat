import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { HostLevelTier } from '@prisma/client';

@Injectable()
export class HostLevelService {
  constructor(private prisma: PrismaService) {}

  private todayDate(): Date {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }

  async getOrCreateHostProfile(userId: string) {
    return this.prisma.hostProfile.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  async getHostProfile(userId: string) {
    const profile = await this.prisma.hostProfile.findUnique({
      where: { userId },
      include: { dailyStats: { orderBy: { date: 'desc' }, take: 7 } },
    });
    if (!profile) return null;

    const levelRule = await this.prisma.hostLevelRule.findFirst({
      where: { level: profile.level },
    });
    const nextRule = await this.prisma.hostLevelRule.findFirst({
      where: { level: profile.level + 1 },
    });

    return { ...profile, levelRule, nextRule };
  }

  async recordLiveMinutes(userId: string, minutes: number) {
    await this.getOrCreateHostProfile(userId);
    const xpEarned = Math.floor(minutes * 2);

    await this.prisma.$transaction([
      this.prisma.hostProfile.update({
        where: { userId },
        data: {
          totalLiveMinutes: { increment: minutes },
          xp: { increment: xpEarned },
        },
      }),
      this.prisma.hostDailyStat.upsert({
        where: {
          hostProfileId_date: {
            hostProfileId: (await this.prisma.hostProfile.findUnique({ where: { userId } }))!.id,
            date: this.todayDate(),
          },
        },
        update: { liveMinutes: { increment: minutes }, xpEarned: { increment: xpEarned } },
        create: {
          hostProfile: { connect: { userId } },
          date: this.todayDate(),
          liveMinutes: minutes,
          xpEarned,
        },
      }),
    ]);

    return this.checkLevelUp(userId);
  }

  async recordGiftReceived(userId: string, giftValue: bigint) {
    await this.getOrCreateHostProfile(userId);
    const xpEarned = Math.floor(Number(giftValue) / 10);

    await this.prisma.hostProfile.update({
      where: { userId },
      data: {
        totalGiftValue: { increment: giftValue },
        xp: { increment: xpEarned },
      },
    });

    const profile = await this.prisma.hostProfile.findUnique({ where: { userId } });
    if (profile) {
      await this.prisma.hostDailyStat.upsert({
        where: { hostProfileId_date: { hostProfileId: profile.id, date: this.todayDate() } },
        update: { giftValue: { increment: giftValue }, xpEarned: { increment: xpEarned } },
        create: { hostProfileId: profile.id, date: this.todayDate(), giftValue, xpEarned },
      });
    }

    return this.checkLevelUp(userId);
  }

  async recordFollower(userId: string) {
    await this.getOrCreateHostProfile(userId);
    await this.prisma.hostProfile.update({
      where: { userId },
      data: { totalFollowers: { increment: 1 }, xp: { increment: 5 } },
    });
    return this.checkLevelUp(userId);
  }

  async recordPkWin(userId: string) {
    await this.getOrCreateHostProfile(userId);
    await this.prisma.hostProfile.update({
      where: { userId },
      data: { pkWins: { increment: 1 }, xp: { increment: 50 } },
    });
    return this.checkLevelUp(userId);
  }

  async checkLevelUp(userId: string) {
    const profile = await this.prisma.hostProfile.findUnique({ where: { userId } });
    if (!profile) return { leveled: false };

    const nextRule = await this.prisma.hostLevelRule.findFirst({
      where: { level: profile.level + 1 },
    });
    if (!nextRule || profile.xp < nextRule.minXp) return { leveled: false };

    const updatedProfile = await this.prisma.hostProfile.update({
      where: { userId },
      data: { level: nextRule.level, tier: nextRule.tier as HostLevelTier },
    });

    return { leveled: true, newLevel: updatedProfile.level, newTier: updatedProfile.tier };
  }

  async getRanking(period: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.hostRankingSnapshot.findMany({
        where: { period },
        orderBy: { rank: 'asc' },
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, displayName: true, avatar: true, uid: true },
            include: { hostProfile: { select: { level: true, tier: true } } },
          },
        },
      }),
      this.prisma.hostRankingSnapshot.count({ where: { period } }),
    ]);

    if (!data.length) {
      // Fallback: return live ranking from hostProfiles
      const profiles = await this.prisma.hostProfile.findMany({
        orderBy: { totalGiftValue: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, displayName: true, avatar: true, uid: true } },
        },
      });
      const profileTotal = await this.prisma.hostProfile.count();
      return {
        data: profiles.map((p, i) => ({
          rank: skip + i + 1,
          userId: p.userId,
          displayName: p.user.displayName,
          avatar: p.user.avatar,
          level: p.level,
          tier: p.tier,
          score: p.totalGiftValue.toString(),
        })),
        total: profileTotal,
        page,
        limit,
        totalPages: Math.ceil(profileTotal / limit),
      };
    }

    return {
      data: data.map((r) => ({
        rank: r.rank,
        userId: r.userId,
        displayName: r.user.displayName,
        avatar: r.user.avatar,
        level: (r.user as any).hostProfile?.level,
        tier: (r.user as any).hostProfile?.tier,
        score: r.score.toString(),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getLevelRules() {
    return this.prisma.hostLevelRule.findMany({ orderBy: { level: 'asc' } });
  }
}
