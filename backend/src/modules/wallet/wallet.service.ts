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
      const before = wallet?.coins || 0;

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
            amount,
            balanceBefore: before,
            balanceAfter: Number(before) + amount,
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
      if (!wallet || wallet.coins < amount) {
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
            amount: -amount,
            balanceBefore: wallet.coins,
            balanceAfter: Number(wallet.coins) - amount,
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
      const before = wallet?.diamonds || 0;

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
            amount,
            balanceBefore: before,
            balanceAfter: Number(before) + amount,
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
    if (!wallet || wallet.diamonds < amount) {
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
      const wallet = await this.prisma.wallet.findUnique({
        where: { userId: senderId },
      });
      if (!wallet || wallet.coins < amount)
        throw new BadRequestException('Insufficient coins');

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
            amount: -amount,
            balanceBefore: Number(wallet.coins),
            balanceAfter: Number(wallet.coins) - amount,
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
            amount,
            balanceBefore: 0,
            balanceAfter: amount,
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
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    const MIN_WITHDRAW = 100;

    if (!wallet || wallet.diamonds < dto.amount)
      throw new BadRequestException('Insufficient diamonds');
    if (dto.amount < MIN_WITHDRAW)
      throw new BadRequestException(
        `Minimum withdrawal is ${MIN_WITHDRAW} diamonds`,
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
  ) {
    await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { userId },
        data: {
          coins: { increment: coins },
          totalRecharge: { increment: amount },
        },
      }),
      this.prisma.transaction.create({
        data: {
          userId,
          type: TransactionType.RECHARGE,
          currency: Currency.COINS,
          amount: coins,
          balanceBefore: 0,
          balanceAfter: coins,
          description: `Recharge ${coins} coins`,
          referenceId,
          status: TransactionStatus.COMPLETED,
        },
      }),
    ]);

    return { message: 'Recharge successful', coins };
  }
}
