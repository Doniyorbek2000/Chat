import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { PurchaseNobleDto, SendNobleDto } from './dto/noble.dto';
import { TransactionType, Currency, TransactionStatus, NobleTier } from '@prisma/client';
import * as dayjs from 'dayjs';

@Injectable()
export class NobleService {
  constructor(
    private prisma: PrismaService,
    private wallet: WalletService,
  ) {}

  async getPlans() {
    return this.prisma.noblePlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getMySubscription(userId: string) {
    return this.prisma.userNobleSubscription.findUnique({
      where: { userId },
      include: { plan: true },
    });
  }

  async purchaseNoble(userId: string, dto: PurchaseNobleDto) {
    const plan = await this.prisma.noblePlan.findUnique({
      where: { id: dto.planId },
    });
    if (!plan || !plan.isActive) throw new NotFoundException('Noble plan not found');

    const months = dto.months ?? 1;
    const price = plan.monthlyPriceCoins * months;

    await this.wallet.deductCoins(
      userId,
      price,
      `Noble subscription: ${plan.name} x${months} months`,
      dto.planId,
    );

    const existingSub = await this.prisma.userNobleSubscription.findUnique({
      where: { userId },
    });

    const nowDate = new Date();
    let expiresAt: Date;

    if (existingSub && existingSub.isActive) {
      if (existingSub.tier === plan.tier) {
        // Extend same tier
        const base = existingSub.expiresAt > nowDate ? existingSub.expiresAt : nowDate;
        expiresAt = dayjs(base).add(months, 'month').toDate();
      } else {
        // Override with new tier (upgrade/downgrade)
        expiresAt = dayjs(nowDate).add(months, 'month').toDate();
      }
    } else {
      expiresAt = dayjs(nowDate).add(months, 'month').toDate();
    }

    const [subscription, purchase] = await this.prisma.$transaction([
      this.prisma.userNobleSubscription.upsert({
        where: { userId },
        update: {
          planId: plan.id,
          tier: plan.tier,
          expiresAt,
          isActive: true,
          startedAt: nowDate,
        },
        create: {
          userId,
          planId: plan.id,
          tier: plan.tier,
          expiresAt,
          isActive: true,
        },
      }),
      this.prisma.noblePurchase.create({
        data: {
          userId,
          planId: plan.id,
          months,
          totalCoins: BigInt(price),
        },
      }),
    ]);

    return { subscription, purchase };
  }

  async sendNoble(senderId: string, dto: SendNobleDto) {
    const plan = await this.prisma.noblePlan.findUnique({
      where: { id: dto.planId },
    });
    if (!plan || !plan.isActive) throw new NotFoundException('Noble plan not found');

    const receiver = await this.prisma.user.findUnique({
      where: { id: dto.receiverId },
    });
    if (!receiver) throw new NotFoundException('Receiver not found');
    if (receiver.id === senderId) throw new BadRequestException('Cannot send noble to yourself');

    const months = dto.months ?? 1;
    const price = plan.monthlyPriceCoins * months;

    await this.wallet.deductCoins(
      senderId,
      price,
      `Send noble gift: ${plan.name} x${months} months to ${receiver.id}`,
      dto.planId,
    );

    const nowDate = new Date();
    const existingSub = await this.prisma.userNobleSubscription.findUnique({
      where: { userId: dto.receiverId },
    });

    let expiresAt: Date;
    if (existingSub && existingSub.isActive && existingSub.tier === plan.tier) {
      const base = existingSub.expiresAt > nowDate ? existingSub.expiresAt : nowDate;
      expiresAt = dayjs(base).add(months, 'month').toDate();
    } else {
      expiresAt = dayjs(nowDate).add(months, 'month').toDate();
    }

    const [gift] = await this.prisma.$transaction([
      this.prisma.nobleGift.create({
        data: {
          senderId,
          receiverId: dto.receiverId,
          planId: plan.id,
          months,
          message: dto.message,
        },
      }),
      this.prisma.userNobleSubscription.upsert({
        where: { userId: dto.receiverId },
        update: {
          planId: plan.id,
          tier: plan.tier,
          expiresAt,
          isActive: true,
          startedAt: nowDate,
        },
        create: {
          userId: dto.receiverId,
          planId: plan.id,
          tier: plan.tier,
          expiresAt,
          isActive: true,
        },
      }),
      this.prisma.noblePurchase.create({
        data: {
          userId: senderId,
          planId: plan.id,
          months,
          totalCoins: BigInt(price),
          recipientId: dto.receiverId,
        },
      }),
    ]);

    return gift;
  }

  async cancelNoble(userId: string) {
    const sub = await this.prisma.userNobleSubscription.findUnique({
      where: { userId },
    });
    if (!sub) throw new NotFoundException('No active noble subscription');

    return this.prisma.userNobleSubscription.update({
      where: { userId },
      data: { isActive: false },
    });
  }

  async getHistory(userId: string) {
    return this.prisma.noblePurchase.findMany({
      where: { userId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
