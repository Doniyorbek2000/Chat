import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PkSeasonStatus } from '@prisma/client';

@Injectable()
export class PkSeasonService {
  constructor(private prisma: PrismaService) {}

  async getCurrentSeason() {
    return this.prisma.pkSeason.findFirst({
      where: { status: PkSeasonStatus.ACTIVE },
      include: { rewards: true },
    });
  }

  async getSeasonRanking(seasonId: string, page = 1, limit = 100) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.pkSeasonParticipant.findMany({
        where: { seasonId },
        orderBy: { totalScore: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, displayName: true, avatar: true, uid: true } },
        },
      }),
      this.prisma.pkSeasonParticipant.count({ where: { seasonId } }),
    ]);

    return {
      data: data.map((p, i) => ({
        rank: skip + i + 1,
        userId: p.userId,
        displayName: p.user.displayName,
        avatar: p.user.avatar,
        wins: p.wins,
        losses: p.losses,
        winStreak: p.winStreak,
        totalScore: p.totalScore.toString(),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getMyStats(userId: string) {
    const season = await this.getCurrentSeason();
    if (!season) return null;

    const participant = await this.prisma.pkSeasonParticipant.findUnique({
      where: { seasonId_userId: { seasonId: season.id, userId } },
    });

    if (!participant) {
      return { season, participant: null };
    }

    // Calculate rank
    const rankAbove = await this.prisma.pkSeasonParticipant.count({
      where: { seasonId: season.id, totalScore: { gt: participant.totalScore } },
    });

    return {
      season,
      participant: {
        ...participant,
        totalScore: participant.totalScore.toString(),
        rank: rankAbove + 1,
      },
    };
  }

  async getMyRewards(userId: string) {
    const season = await this.getCurrentSeason();
    if (!season) return [];

    const participant = await this.prisma.pkSeasonParticipant.findUnique({
      where: { seasonId_userId: { seasonId: season.id, userId } },
    });
    if (!participant?.rank) return [];

    return this.prisma.pkSeasonReward.findMany({
      where: {
        seasonId: season.id,
        rankFrom: { lte: participant.rank },
        rankTo: { gte: participant.rank },
      },
    });
  }

  async recordBattleResult(
    hostAId: string,
    hostBId: string,
    winnerId: string | null,
    hostAScore: bigint,
    hostBScore: bigint,
    battleId: string,
  ) {
    const season = await this.getCurrentSeason();

    await this.prisma.pkBattleHistory.create({
      data: {
        battleId,
        seasonId: season?.id,
        hostAId,
        hostBId,
        winnerId,
        hostAScore,
        hostBScore,
      },
    });

    if (!season) return;

    // Update season participants
    for (const hostId of [hostAId, hostBId]) {
      const isWinner = winnerId === hostId;
      const score = hostId === hostAId ? hostAScore : hostBScore;

      const current = await this.prisma.pkSeasonParticipant.findUnique({
        where: { seasonId_userId: { seasonId: season.id, userId: hostId } },
      });

      const newWinStreak = isWinner ? (current?.winStreak ?? 0) + 1 : 0;
      const maxStreak = Math.max(current?.maxStreak ?? 0, newWinStreak);

      await this.prisma.pkSeasonParticipant.upsert({
        where: { seasonId_userId: { seasonId: season.id, userId: hostId } },
        update: {
          wins: { increment: isWinner ? 1 : 0 },
          losses: { increment: isWinner ? 0 : 1 },
          winStreak: newWinStreak,
          maxStreak,
          totalScore: { increment: score + BigInt(isWinner ? 100 : 0) },
        },
        create: {
          seasonId: season.id,
          userId: hostId,
          wins: isWinner ? 1 : 0,
          losses: isWinner ? 0 : 1,
          winStreak: newWinStreak,
          maxStreak,
          totalScore: score + BigInt(isWinner ? 100 : 0),
        },
      });
    }
  }

  async claimSeasonReward(userId: string, seasonId: string) {
    const season = await this.prisma.pkSeason.findUnique({
      where: { id: seasonId },
      include: { rewards: true },
    });
    if (!season) throw new NotFoundException('Season topilmadi');
    if (season.status !== PkSeasonStatus.ENDED) {
      throw new BadRequestException('Season hali tugamagan');
    }

    const participant = await this.prisma.pkSeasonParticipant.findUnique({
      where: { seasonId_userId: { seasonId, userId } },
    });
    if (!participant) throw new NotFoundException('Siz bu seasonda qatnashmadingiz');
    if (participant.isRewarded) throw new ConflictException('Mukofot allaqachon olindi');
    if (!participant.rank) throw new BadRequestException('Rank aniqlanmagan');

    const reward = season.rewards.find(
      (r) => r.rankFrom <= participant.rank! && r.rankTo >= participant.rank!,
    );
    if (!reward) throw new BadRequestException("Bu reyting uchun mukofot yo'q");

    await this.prisma.$transaction(async (tx) => {
      await tx.pkSeasonParticipant.update({
        where: { seasonId_userId: { seasonId, userId } },
        data: { isRewarded: true },
      });

      if (reward.rewardType === 'COINS') {
        await tx.wallet.update({
          where: { userId },
          data: { coins: { increment: reward.rewardAmount } },
        });
      }
    });

    return { success: true, reward };
  }

  // Admin
  async listSeasons(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.pkSeason.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' }, include: { rewards: true } }),
      this.prisma.pkSeason.count(),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async createSeason(dto: any) {
    return this.prisma.pkSeason.create({ data: { ...dto, status: PkSeasonStatus.UPCOMING } });
  }

  async updateSeason(id: string, dto: any) {
    return this.prisma.pkSeason.update({ where: { id }, data: dto });
  }

  async endSeason(id: string) {
    const season = await this.prisma.pkSeason.findUnique({ where: { id }, include: { participants: { orderBy: { totalScore: 'desc' } } } });
    if (!season) throw new NotFoundException();

    await this.prisma.$transaction([
      this.prisma.pkSeason.update({ where: { id }, data: { status: PkSeasonStatus.ENDED } }),
      ...season.participants.map((p, i) =>
        this.prisma.pkSeasonParticipant.update({ where: { id: p.id }, data: { rank: i + 1 } }),
      ),
    ]);

    return { success: true, participantsRanked: season.participants.length };
  }
}
