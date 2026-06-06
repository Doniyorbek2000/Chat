import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MissionPeriod, MissionActionType } from '@prisma/client';

@Injectable()
export class MissionsService {
  constructor(private prisma: PrismaService) {}

  getPeriodKey(period: MissionPeriod): string {
    const now = new Date();
    if (period === MissionPeriod.DAILY) {
      return now.toISOString().split('T')[0];
    }
    if (period === MissionPeriod.WEEKLY) {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const week = Math.ceil(
        ((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7,
      );
      return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
    }
    return 'special';
  }

  async getMissionsWithProgress(userId: string, period: MissionPeriod) {
    const periodKey = this.getPeriodKey(period);
    const missions = await this.prisma.mission.findMany({
      where: { period, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    const progressRecords = await this.prisma.userMissionProgress.findMany({
      where: { userId, periodKey, missionId: { in: missions.map((m) => m.id) } },
    });

    const progressMap = new Map(progressRecords.map((p) => [p.missionId, p]));

    return missions.map((m) => {
      const p = progressMap.get(m.id);
      return {
        ...m,
        rewardAmount: m.rewardAmount.toString(),
        progress: p?.progress ?? 0,
        isClaimed: p?.isClaimed ?? false,
        claimedAt: p?.claimedAt ?? null,
      };
    });
  }

  async getDailyMissions(userId: string) {
    return this.getMissionsWithProgress(userId, MissionPeriod.DAILY);
  }

  async getWeeklyMissions(userId: string) {
    return this.getMissionsWithProgress(userId, MissionPeriod.WEEKLY);
  }

  async getMyMissions(userId: string) {
    const [daily, weekly] = await Promise.all([
      this.getMissionsWithProgress(userId, MissionPeriod.DAILY),
      this.getMissionsWithProgress(userId, MissionPeriod.WEEKLY),
    ]);
    return { daily, weekly };
  }

  async incrementProgress(userId: string, actionType: MissionActionType, amount = 1) {
    const missions = await this.prisma.mission.findMany({
      where: { actionType, isActive: true },
    });

    for (const mission of missions) {
      const periodKey = this.getPeriodKey(mission.period);
      const existing = await this.prisma.userMissionProgress.findUnique({
        where: { userId_missionId_periodKey: { userId, missionId: mission.id, periodKey } },
      });

      if (existing?.isClaimed) continue;

      const currentProgress = existing?.progress ?? 0;
      const newProgress = Math.min(currentProgress + amount, mission.targetCount);

      await this.prisma.userMissionProgress.upsert({
        where: { userId_missionId_periodKey: { userId, missionId: mission.id, periodKey } },
        update: { progress: newProgress },
        create: { userId, missionId: mission.id, periodKey, progress: newProgress },
      });
    }
  }

  async claimMission(userId: string, missionId: string) {
    const mission = await this.prisma.mission.findUnique({ where: { id: missionId } });
    if (!mission) throw new NotFoundException('Mission topilmadi');

    const periodKey = this.getPeriodKey(mission.period);

    const progress = await this.prisma.userMissionProgress.findUnique({
      where: { userId_missionId_periodKey: { userId, missionId, periodKey } },
    });

    if (progress?.isClaimed) {
      throw new ConflictException('Bu missiya allaqachon olingan');
    }

    if ((progress?.progress ?? 0) < mission.targetCount) {
      throw new BadRequestException(
        `Missiya hali bajarilmagan: ${progress?.progress ?? 0}/${mission.targetCount}`,
      );
    }

    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Hamyon topilmadi');

    await this.prisma.$transaction(async (tx) => {
      await tx.userMissionProgress.upsert({
        where: { userId_missionId_periodKey: { userId, missionId, periodKey } },
        update: { isClaimed: true, claimedAt: new Date() },
        create: {
          userId,
          missionId,
          periodKey,
          progress: mission.targetCount,
          isClaimed: true,
          claimedAt: new Date(),
        },
      });

      // Award reward
      const amount = mission.rewardAmount;
      if (mission.rewardType === 'COINS') {
        const balanceBefore = wallet.coins;
        const balanceAfter = balanceBefore + amount;
        await tx.wallet.update({
          where: { userId },
          data: { coins: { increment: amount } },
        });
        await tx.transaction.create({
          data: {
            userId,
            type: 'REWARD',
            currency: 'COINS',
            amount,
            balanceBefore,
            balanceAfter,
            status: 'COMPLETED',
            description: `Missiya mukofoti: ${mission.title}`,
          },
        });
      } else if (mission.rewardType === 'DIAMONDS') {
        const balanceBefore = wallet.diamonds;
        const balanceAfter = balanceBefore + amount;
        await tx.wallet.update({
          where: { userId },
          data: { diamonds: { increment: amount } },
        });
        await tx.transaction.create({
          data: {
            userId,
            type: 'REWARD',
            currency: 'DIAMONDS',
            amount,
            balanceBefore,
            balanceAfter,
            status: 'COMPLETED',
            description: `Missiya mukofoti: ${mission.title}`,
          },
        });
      }
    });

    return { success: true, reward: { type: mission.rewardType, amount: mission.rewardAmount.toString() } };
  }

  // Admin methods
  async listMissions(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.mission.findMany({ skip, take: limit, orderBy: { sortOrder: 'asc' } }),
      this.prisma.mission.count(),
    ]);
    return { data: data.map(m => ({ ...m, rewardAmount: m.rewardAmount.toString() })), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async createMission(dto: any) {
    return this.prisma.mission.create({ data: dto });
  }

  async updateMission(id: string, dto: any) {
    return this.prisma.mission.update({ where: { id }, data: dto });
  }

  async toggleMission(id: string) {
    const m = await this.prisma.mission.findUnique({ where: { id } });
    if (!m) throw new NotFoundException();
    return this.prisma.mission.update({ where: { id }, data: { isActive: !m.isActive } });
  }
}
