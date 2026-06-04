import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { UnlockMedalDto, EquipMedalDto, SetMedalWallDto } from './dto/medals.dto';
import { MedalCategory } from '@prisma/client';

@Injectable()
export class MedalsService {
  constructor(
    private prisma: PrismaService,
    private wallet: WalletService,
  ) {}

  async getMedals(category?: MedalCategory) {
    return this.prisma.medal.findMany({
      where: {
        isActive: true,
        ...(category ? { category } : {}),
      },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  async getMedalById(id: string) {
    const medal = await this.prisma.medal.findUnique({ where: { id } });
    if (!medal) throw new NotFoundException('Medal not found');
    return medal;
  }

  async getMedalOwners(id: string, limit = 20) {
    return this.prisma.userMedal.findMany({
      where: { medalId: id },
      take: limit,
      orderBy: { unlockedAt: 'asc' },
      include: {
        user: {
          select: { id: true, uid: true, displayName: true, avatar: true, level: true },
        },
      },
    });
  }

  async getMyMedals(userId: string) {
    const [userMedals, prestigeSnapshot] = await Promise.all([
      this.prisma.userMedal.findMany({
        where: { userId },
        include: { medal: true },
        orderBy: { unlockedAt: 'desc' },
      }),
      this.prisma.userPrestigeSnapshot.findUnique({
        where: { userId },
      }),
    ]);

    return { medals: userMedals, prestige: prestigeSnapshot };
  }

  async getPrestigeRules() {
    return this.prisma.prestigeLevelRule.findMany({
      orderBy: { level: 'asc' },
    });
  }

  async getLeaderboard(limit = 50) {
    return this.prisma.userPrestigeSnapshot.findMany({
      take: limit,
      orderBy: { totalPoints: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            uid: true,
            displayName: true,
            avatar: true,
            level: true,
          },
        },
      },
    });
  }

  async unlockMedal(userId: string, dto: UnlockMedalDto) {
    const medal = await this.prisma.medal.findUnique({
      where: { id: dto.medalId },
    });
    if (!medal || !medal.isActive) throw new NotFoundException('Medal not found');

    // Check not already owned
    const existing = await this.prisma.userMedal.findUnique({
      where: { userId_medalId: { userId, medalId: dto.medalId } },
    });
    if (existing) throw new BadRequestException('Medal already unlocked');

    if (medal.isPaid && medal.priceCoins > 0) {
      await this.wallet.deductCoins(
        userId,
        medal.priceCoins,
        `Unlock medal: ${medal.name}`,
        medal.id,
      );
    }

    const userMedal = await this.prisma.userMedal.create({
      data: { userId, medalId: medal.id },
      include: { medal: true },
    });

    await this.recalculatePrestige(userId);

    return userMedal;
  }

  async equipMedal(userId: string, dto: EquipMedalDto) {
    const userMedal = await this.prisma.userMedal.findUnique({
      where: { userId_medalId: { userId, medalId: dto.medalId } },
    });
    if (!userMedal) throw new NotFoundException('You do not own this medal');

    return this.prisma.userMedal.update({
      where: { userId_medalId: { userId, medalId: dto.medalId } },
      data: { equippedSlot: dto.slot ?? 0 },
      include: { medal: true },
    });
  }

  async unequipMedal(userId: string, medalId: string) {
    const userMedal = await this.prisma.userMedal.findUnique({
      where: { userId_medalId: { userId, medalId } },
    });
    if (!userMedal) throw new NotFoundException('You do not own this medal');

    return this.prisma.userMedal.update({
      where: { userId_medalId: { userId, medalId } },
      data: { equippedSlot: null },
      include: { medal: true },
    });
  }

  async setMedalWallSlot(userId: string, dto: SetMedalWallDto) {
    if (dto.medalId) {
      const userMedal = await this.prisma.userMedal.findUnique({
        where: { userId_medalId: { userId, medalId: dto.medalId } },
      });
      if (!userMedal) throw new NotFoundException('You do not own this medal');
    }

    return this.prisma.medalWallSlot.upsert({
      where: { userId_slotIndex: { userId, slotIndex: dto.slotIndex } },
      update: { medalId: dto.medalId ?? null },
      create: { userId, slotIndex: dto.slotIndex, medalId: dto.medalId ?? null },
      include: { medal: true },
    });
  }

  private async recalculatePrestige(userId: string, tx?: any) {
    const db = tx ?? this.prisma;

    const userMedals = await db.userMedal.findMany({
      where: { userId },
      include: { medal: { select: { prestigeValue: true } } },
    });

    const totalPoints = userMedals.reduce(
      (sum: number, um: { medal: { prestigeValue: number } }) => sum + (um.medal.prestigeValue || 0),
      0,
    );

    const rules = await db.prestigeLevelRule.findMany({
      orderBy: { level: 'asc' },
    });

    let level = 0;
    for (const rule of rules) {
      if (totalPoints >= rule.requiredPoints) {
        level = rule.level;
      } else {
        break;
      }
    }

    return db.userPrestigeSnapshot.upsert({
      where: { userId },
      update: { totalPoints, level },
      create: { userId, totalPoints, level },
    });
  }
}
