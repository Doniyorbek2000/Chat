import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import * as dayjs from 'dayjs';

@Injectable()
export class NameplatesService {
  constructor(
    private prisma: PrismaService,
    private wallet: WalletService,
  ) {}

  async getNameplates() {
    return this.prisma.nameplate.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }],
    });
  }

  async getMyNameplates(userId: string) {
    return this.prisma.userNameplate.findMany({
      where: { userId },
      include: { nameplate: true },
      orderBy: { purchasedAt: 'desc' },
    });
  }

  async buyNameplate(userId: string, nameplateId: string) {
    const nameplate = await this.prisma.nameplate.findUnique({
      where: { id: nameplateId },
    });
    if (!nameplate || !nameplate.isActive) {
      throw new NotFoundException('Nameplate not found');
    }

    if (nameplate.levelRequired > 0) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { level: true },
      });
      if (!user) throw new NotFoundException('User not found');
      if ((user.level ?? 0) < nameplate.levelRequired) {
        throw new BadRequestException(`Level ${nameplate.levelRequired} required`);
      }
    }

    const existing = await this.prisma.userNameplate.findUnique({
      where: { userId_nameplateId: { userId, nameplateId } },
    });

    if (existing) {
      if (!existing.expiresAt || new Date() <= existing.expiresAt) {
        throw new BadRequestException('You already own this nameplate');
      }
    }

    await this.wallet.deductCoins(
      userId,
      nameplate.priceCoins,
      `Purchase nameplate: ${nameplate.name}`,
      nameplateId,
    );

    const expiresAt = nameplate.durationDays
      ? dayjs().add(nameplate.durationDays, 'day').toDate()
      : undefined;

    return this.prisma.userNameplate.upsert({
      where: { userId_nameplateId: { userId, nameplateId } },
      update: { purchasedAt: new Date(), expiresAt: expiresAt ?? null, isEquipped: false },
      create: { userId, nameplateId, expiresAt: expiresAt ?? null },
      include: { nameplate: true },
    });
  }

  async equipNameplate(userId: string, nameplateId: string) {
    const userNameplate = await this.prisma.userNameplate.findUnique({
      where: { userId_nameplateId: { userId, nameplateId } },
    });
    if (!userNameplate) throw new NotFoundException('You do not own this nameplate');
    if (userNameplate.expiresAt && new Date() > userNameplate.expiresAt) {
      throw new BadRequestException('Nameplate has expired');
    }

    await this.prisma.userNameplate.updateMany({
      where: { userId, isEquipped: true },
      data: { isEquipped: false },
    });

    return this.prisma.userNameplate.update({
      where: { userId_nameplateId: { userId, nameplateId } },
      data: { isEquipped: true },
      include: { nameplate: true },
    });
  }

  async unequipNameplate(userId: string) {
    await this.prisma.userNameplate.updateMany({
      where: { userId, isEquipped: true },
      data: { isEquipped: false },
    });
    return { message: 'Nameplate unequipped' };
  }
}
