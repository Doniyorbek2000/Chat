import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { Currency } from '@prisma/client';
import dayjs from 'dayjs';

@Injectable()
export class VipService {
  private readonly logger = new Logger(VipService.name);

  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
  ) {}

  async getVipPlans() {
    return this.prisma.vipPlan.findMany({
      where: { isActive: true },
      orderBy: { level: 'asc' },
    });
  }

  async getVipStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        isVip: true,
        vipLevel: true,
        vipExpiresAt: true,
        vipSubscriptions: {
          where: { isActive: true },
          include: { plan: true },
          orderBy: { expiresAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    return {
      isVip: user.isVip,
      vipLevel: user.vipLevel,
      vipExpiresAt: user.vipExpiresAt,
      currentPlan: user.vipSubscriptions[0]?.plan || null,
      daysRemaining: user.vipExpiresAt
        ? Math.max(0, dayjs(user.vipExpiresAt).diff(dayjs(), 'day'))
        : 0,
    };
  }

  async purchaseVip(userId: string, planId: string) {
    const plan = await this.prisma.vipPlan.findUnique({
      where: { id: planId },
    });
    if (!plan || !plan.isActive)
      throw new NotFoundException('VIP plan not found');

    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    const price = BigInt(plan.price);

    if (plan.currency === Currency.COINS) {
      if (wallet.coins < price) {
        throw new BadRequestException('Insufficient coins balance');
      }
      await this.walletService.deductCoins(
        userId,
        Number(price),
        `VIP ${plan.name} subscription`,
        planId,
      );
    } else {
      if (wallet.diamonds < price) {
        throw new BadRequestException('Insufficient diamonds balance');
      }
      await this.walletService.deductDiamonds(
        userId,
        Number(price),
        `VIP ${plan.name} subscription`,
      );
    }

    const expiresAt = dayjs().add(plan.duration, 'day').toDate();

    await this.prisma.userVip.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });

    const subscription = await this.prisma.userVip.create({
      data: {
        userId,
        planId,
        level: plan.level,
        startedAt: new Date(),
        expiresAt,
        isActive: true,
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isVip: true,
        vipLevel: plan.level,
        vipExpiresAt: expiresAt,
      },
    });

    return {
      subscription,
      plan,
      expiresAt,
      message: `VIP ${plan.name} activated successfully!`,
    };
  }

  async renewVip(userId: string, planId: string) {
    return this.purchaseVip(userId, planId);
  }

  async checkAndExpireVip() {
    const expiredVips = await this.prisma.userVip.findMany({
      where: {
        isActive: true,
        expiresAt: { lte: new Date() },
      },
    });

    for (const vip of expiredVips) {
      await this.prisma.userVip.update({
        where: { id: vip.id },
        data: { isActive: false },
      });

      await this.prisma.user.update({
        where: { id: vip.userId },
        data: {
          isVip: false,
          vipLevel: 0,
          vipExpiresAt: null,
        },
      });

      this.logger.log(`VIP expired for user ${vip.userId}`);
    }

    return expiredVips.length;
  }

  async checkVipBenefits(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isVip: true, vipLevel: true },
    });

    if (!user || !user.isVip) {
      return { hasVip: false, benefits: [] };
    }

    const benefits = [];
    if (user.vipLevel >= 1) benefits.push('exclusive_frame', 'entry_effect');
    if (user.vipLevel >= 3) benefits.push('chat_bubble', 'exclusive_gifts');
    if (user.vipLevel >= 5) benefits.push('no_ads', 'priority_seat');
    if (user.vipLevel >= 7)
      benefits.push('exclusive_vehicle', 'vip_room_access');
    if (user.vipLevel >= 10)
      benefits.push('global_announcement', 'dedicated_support');

    return { hasVip: true, vipLevel: user.vipLevel, benefits };
  }

  async applyVipFrame(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isVip: true, vipLevel: true },
    });

    if (!user?.isVip) throw new BadRequestException('VIP required');

    const plan = await this.prisma.vipPlan.findFirst({
      where: { level: user.vipLevel },
    });

    return {
      frameUrl: plan?.frameUrl || null,
      chatBubbleUrl: plan?.chatBubbleUrl || null,
      entryEffectUrl: plan?.entryEffectUrl || null,
    };
  }
}
