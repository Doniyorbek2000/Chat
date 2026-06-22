import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { TransferDto, WithdrawDto } from './dto/wallet.dto';
import {
  TransactionType,
  Currency,
  WithdrawalMethod,
  WithdrawalStatus,
  TransactionStatus,
} from '@prisma/client';
import * as Redis from 'ioredis';

@Injectable()
export class WalletService {
  private redis: Redis.Redis;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.redis = new Redis.Redis(
      this.config.get<string>('redis.url') || 'redis://localhost:6379',
    );
  }

  async getBalance(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');
    return wallet;
  }

  async addCoins(
    userId: string,
    amount: number,
    description: string,
    referenceId?: string,
  ) {
    const lockKey = `wallet_lock:${userId}`;
    await this.redis.set(lockKey, '1', 'EX', 5, 'NX');

    try {
      const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
      const before = wallet?.coins ?? BigInt(0);

      const [updated] = await this.prisma.$transaction([
        this.prisma.wallet.update({
          where: { userId },
          data: { coins: { increment: amount } },
        }),
        this.prisma.transaction.create({
          data: {
            userId,
            type: TransactionType.REWARD,
            currency: Currency.COINS,
            amount: BigInt(amount),
            balanceBefore: before,
            balanceAfter: before + BigInt(amount),
            description,
            referenceId,
            status: TransactionStatus.COMPLETED,
          },
        }),
      ]);

      return updated;
    } finally {
      await this.redis.del(lockKey);
    }
  }

  async deductCoins(
    userId: string,
    amount: number,
    description: string,
    referenceId?: string,
  ) {
    const lockKey = `wallet_lock:${userId}`;
    await this.redis.set(lockKey, '1', 'EX', 5, 'NX');

    try {
      const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
      if (!wallet || wallet.coins < BigInt(amount)) {
        throw new BadRequestException('Insufficient coins');
      }

      const [updated] = await this.prisma.$transaction([
        this.prisma.wallet.update({
          where: { userId },
          data: { coins: { decrement: amount } },
        }),
        this.prisma.transaction.create({
          data: {
            userId,
            type: TransactionType.GIFT_SEND,
            currency: Currency.COINS,
            amount: -BigInt(amount),
            balanceBefore: wallet.coins,
            balanceAfter: wallet.coins - BigInt(amount),
            description,
            referenceId,
            status: TransactionStatus.COMPLETED,
          },
        }),
      ]);

      return updated;
    } finally {
      await this.redis.del(lockKey);
    }
  }

  async addDiamonds(
    userId: string,
    amount: number,
    description: string,
    referenceId?: string,
  ) {
    const lockKey = `wallet:diamonds:add:${userId}`;
    const acquired = await this.redis.set(lockKey, '1', 'EX', 5, 'NX');
    if (!acquired) {
      throw new BadRequestException(
        'Wallet operation in progress, please retry',
      );
    }

    try {
      const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
      const before = wallet?.diamonds ?? BigInt(0);

      const [updated] = await this.prisma.$transaction([
        this.prisma.wallet.update({
          where: { userId },
          data: {
            diamonds: { increment: amount },
            totalEarned: { increment: amount },
          },
        }),
        this.prisma.transaction.create({
          data: {
            userId,
            type: TransactionType.GIFT_RECEIVE,
            currency: Currency.DIAMONDS,
            amount: BigInt(amount),
            balanceBefore: before,
            balanceAfter: before + BigInt(amount),
            description,
            referenceId,
            status: TransactionStatus.COMPLETED,
          },
        }),
      ]);

      return updated;
    } finally {
      await this.redis.del(lockKey);
    }
  }

  async deductDiamonds(userId: string, amount: number, description: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet || wallet.diamonds < BigInt(amount)) {
      throw new BadRequestException('Insufficient diamonds');
    }

    return this.prisma.wallet.update({
      where: { userId },
      data: { diamonds: { decrement: amount } },
    });
  }

  async transfer(senderId: string, dto: TransferDto) {
    const { receiverUid, amount } = dto;
    const currency = Currency.COINS;

    const receiver = await this.prisma.user.findUnique({
      where: { uid: receiverUid },
    });
    if (!receiver) throw new NotFoundException('Recipient not found');
    if (receiver.id === senderId)
      throw new BadRequestException('Cannot transfer to yourself');

    if (currency === Currency.COINS) {
      const [senderWallet, receiverWallet] = await Promise.all([
        this.prisma.wallet.findUnique({ where: { userId: senderId } }),
        this.prisma.wallet.findUnique({ where: { userId: receiver.id } }),
      ]);
      if (!senderWallet || senderWallet.coins < BigInt(amount))
        throw new BadRequestException('Insufficient coins');

      const receiverCoins = receiverWallet?.coins ?? BigInt(0);

      await this.prisma.$transaction([
        this.prisma.wallet.update({
          where: { userId: senderId },
          data: { coins: { decrement: amount } },
        }),
        this.prisma.wallet.update({
          where: { userId: receiver.id },
          data: { coins: { increment: amount } },
        }),
        this.prisma.transaction.create({
          data: {
            userId: senderId,
            type: TransactionType.TRANSFER,
            currency,
            amount: -BigInt(amount),
            balanceBefore: senderWallet.coins,
            balanceAfter: senderWallet.coins - BigInt(amount),
            description: `Transfer to ${receiverUid}`,
            referenceId: receiver.id,
            status: TransactionStatus.COMPLETED,
          },
        }),
        this.prisma.transaction.create({
          data: {
            userId: receiver.id,
            type: TransactionType.TRANSFER,
            currency,
            amount: BigInt(amount),
            balanceBefore: receiverCoins,
            balanceAfter: receiverCoins + BigInt(amount),
            description: `Received from sender`,
            referenceId: senderId,
            status: TransactionStatus.COMPLETED,
          },
        }),
      ]);
    }

    return { message: 'Transfer successful' };
  }

  async getTransactionHistory(userId: string, page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { userId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.transaction.count({ where: { userId } }),
    ]);

    return { data, total, page, limit };
  }

  async requestWithdrawal(userId: string, dto: WithdrawDto) {
    const dedupeKey = `withdraw:${userId}`;
    const locked = await this.redis.set(dedupeKey, '1', 'EX', 10, 'NX');
    if (!locked) throw new BadRequestException('Request already processing');

    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    const MIN_WITHDRAW = 100;
    const MAX_WITHDRAW = 10000000;

    if (!wallet || wallet.diamonds < BigInt(dto.amount))
      throw new BadRequestException('Insufficient diamonds');
    if (dto.amount < MIN_WITHDRAW)
      throw new BadRequestException(
        `Minimum withdrawal is ${MIN_WITHDRAW} diamonds`,
      );
    if (dto.amount > MAX_WITHDRAW)
      throw new BadRequestException(
        `Maximum withdrawal is ${MAX_WITHDRAW} diamonds`,
      );

    const pendingCount = await this.prisma.withdrawal.count({
      where: { userId, status: WithdrawalStatus.PENDING },
    });
    if (pendingCount >= 1)
      throw new BadRequestException('You have a pending withdrawal request');

    await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { userId },
        data: { diamonds: { decrement: dto.amount } },
      }),
      this.prisma.withdrawal.create({
        data: {
          userId,
          amount: dto.amount,
          currency: Currency.DIAMONDS,
          method: dto.method as WithdrawalMethod,
          accountNumber: dto.accountNumber,
          accountName: dto.accountName,
        },
      }),
    ]);

    return { message: 'Withdrawal request submitted' };
  }

  async processRecharge(
    userId: string,
    amount: number,
    coins: number,
    referenceId: string,
    bonusCoins = 0,
  ) {
    const totalCoins = coins + bonusCoins;
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    const before = wallet?.coins ?? BigInt(0);

    await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { userId },
        data: {
          coins: { increment: totalCoins },
          totalRecharge: { increment: amount },
        },
      }),
      this.prisma.transaction.create({
        data: {
          userId,
          type: TransactionType.RECHARGE,
          currency: Currency.COINS,
          amount: BigInt(totalCoins),
          balanceBefore: before,
          balanceAfter: before + BigInt(totalCoins),
          description: `Recharge ${coins} coins${bonusCoins > 0 ? ` + ${bonusCoins} bonus` : ''}`,
          referenceId,
          status: TransactionStatus.COMPLETED,
        },
      }),
    ]);

    return { message: 'Recharge successful', coins, bonusCoins, totalCoins };
  }

  async getRechargeProducts() {
    const products = await this.prisma.rechargeProduct.findMany({
      where: { isActive: true },
      orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }],
    });
    if (products.length > 0) return products;

    // Fallback: hardcoded products when seed not yet run
    return [
      { productId: 'voxo_coin_1000000', title: '1,000,000 Tanga', type: 'COINS', baseAmount: 1000000, bonusAmount: 500000, priceUzs: 9900 },
      { productId: 'voxo_coin_5000000', title: '5,000,000 Tanga', type: 'COINS', baseAmount: 5000000, bonusAmount: 1000000, priceUzs: 44900 },
      { productId: 'voxo_coin_10000000', title: '10,000,000 Tanga', type: 'COINS', baseAmount: 10000000, bonusAmount: 1500000, priceUzs: 79900 },
      { productId: 'voxo_diamond_100', title: '100 Olmos', type: 'DIAMONDS', baseAmount: 100, bonusAmount: 0, priceUzs: 9900 },
      { productId: 'voxo_diamond_500', title: '500 Olmos', type: 'DIAMONDS', baseAmount: 500, bonusAmount: 0, priceUzs: 44900 },
      { productId: 'voxo_diamond_1000', title: '1,000 Olmos', type: 'DIAMONDS', baseAmount: 1000, bonusAmount: 0, priceUzs: 79900 },
    ];
  }

  async getFirstRechargeOffer(userId: string) {
    const existing = await this.prisma.userFirstRecharge.findUnique({ where: { userId } });
    if (existing) return { eligible: false };

    return {
      eligible: true,
      offers: [
        { productId: 'voxo_first_recharge_099', priceUzs: 990, coins: 100000, bonusCoins: 50000 },
        { productId: 'voxo_first_recharge_499', priceUzs: 4900, coins: 500000, bonusCoins: 250000 },
        { productId: 'voxo_first_recharge_999', priceUzs: 9900, coins: 1000000, bonusCoins: 1000000 },
      ],
    };
  }

  async getDailyRechargeProgress(userId: string) {
    const date = new Date().toISOString().slice(0, 10);
    const progress = await this.prisma.userDailyRechargeProgress.findUnique({
      where: { userId_date: { userId, date } },
    });

    const thresholds = [1_000_000, 2_000_000, 3_000_000, 5_000_000, 10_000_000];
    const rewards = [50_000, 50_000, 100_000, 200_000, 500_000];
    const totalCoins = Number(progress?.totalCoins ?? 0);
    const claimed: number[] = progress?.claimedTiers as number[] ?? [];

    return {
      date,
      totalCoins,
      thresholds,
      rewards,
      claimedTiers: claimed,
      nextTier: thresholds.findIndex((t, i) => totalCoins >= t && !claimed.includes(i)),
    };
  }

  async claimDailyRecharge(userId: string, tier: number) {
    const thresholds = [1_000_000, 2_000_000, 3_000_000, 5_000_000, 10_000_000];
    const rewards = [50_000, 50_000, 100_000, 200_000, 500_000];

    if (tier < 0 || tier >= thresholds.length) {
      throw new BadRequestException('Invalid tier');
    }

    const date = new Date().toISOString().slice(0, 10);
    const progress = await this.prisma.userDailyRechargeProgress.findUnique({
      where: { userId_date: { userId, date } },
    });

    const claimed: number[] = progress?.claimedTiers as number[] ?? [];
    if (claimed.includes(tier)) throw new BadRequestException('Tier already claimed');
    if (Number(progress?.totalCoins ?? 0) < thresholds[tier]) {
      throw new BadRequestException('Insufficient recharge for this tier');
    }

    const reward = rewards[tier];
    claimed.push(tier);

    await this.prisma.$transaction([
      this.prisma.userDailyRechargeProgress.upsert({
        where: { userId_date: { userId, date } },
        update: { claimedTiers: claimed },
        create: { userId, date, totalCoins: 0, claimedTiers: claimed },
      }),
      this.prisma.wallet.update({
        where: { userId },
        data: { coins: { increment: reward } },
      }),
    ]);

    return { claimedTier: tier, coinsAwarded: reward };
  }
}
