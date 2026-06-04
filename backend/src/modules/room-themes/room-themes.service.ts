import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import * as dayjs from 'dayjs';

@Injectable()
export class RoomThemesService {
  constructor(
    private prisma: PrismaService,
    private wallet: WalletService,
  ) {}

  async getRoomThemes() {
    return this.prisma.roomTheme.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }],
    });
  }

  async getMyThemes(userId: string) {
    return this.prisma.userRoomTheme.findMany({
      where: { userId },
      include: { theme: true },
      orderBy: { purchasedAt: 'desc' },
    });
  }

  async buyRoomTheme(userId: string, themeId: string) {
    const theme = await this.prisma.roomTheme.findUnique({
      where: { id: themeId },
    });
    if (!theme || !theme.isActive) throw new NotFoundException('Room theme not found');

    const existing = await this.prisma.userRoomTheme.findUnique({
      where: { userId_themeId: { userId, themeId } },
    });

    if (existing) {
      if (!existing.expiresAt || new Date() <= existing.expiresAt) {
        throw new BadRequestException('You already own this room theme');
      }
    }

    await this.wallet.deductCoins(
      userId,
      theme.priceCoins,
      `Purchase room theme: ${theme.name}`,
      themeId,
    );

    const expiresAt = theme.durationDays
      ? dayjs().add(theme.durationDays, 'day').toDate()
      : undefined;

    return this.prisma.userRoomTheme.upsert({
      where: { userId_themeId: { userId, themeId } },
      update: { purchasedAt: new Date(), expiresAt: expiresAt ?? null, isEquipped: false },
      create: { userId, themeId, expiresAt: expiresAt ?? null },
      include: { theme: true },
    });
  }

  async equipRoomTheme(userId: string, themeId: string) {
    const userTheme = await this.prisma.userRoomTheme.findUnique({
      where: { userId_themeId: { userId, themeId } },
    });
    if (!userTheme) throw new NotFoundException('You do not own this room theme');
    if (userTheme.expiresAt && new Date() > userTheme.expiresAt) {
      throw new BadRequestException('Room theme has expired');
    }

    await this.prisma.userRoomTheme.updateMany({
      where: { userId, isEquipped: true },
      data: { isEquipped: false },
    });

    return this.prisma.userRoomTheme.update({
      where: { userId_themeId: { userId, themeId } },
      data: { isEquipped: true },
      include: { theme: true },
    });
  }

  async unequipRoomTheme(userId: string) {
    await this.prisma.userRoomTheme.updateMany({
      where: { userId, isEquipped: true },
      data: { isEquipped: false },
    });
    return { message: 'Room theme unequipped' };
  }
}
