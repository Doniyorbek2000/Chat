import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { SendGiftDto } from './dto/gift.dto';
import { TransactionType, Currency, TransactionStatus } from '@prisma/client';
import * as Redis from 'ioredis';

@Injectable()
export class GiftsService {
  private readonly redis: Redis.Redis;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.redis = new Redis.Redis(
      this.config.get<string>('redis.url') || 'redis://localhost:6379',
    );
  }

  async getGifts(category?: string) {
    return this.prisma.gift.findMany({
      where: { isActive: true, ...(category && { category: category as any }) },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  async getGiftsByCategory() {
    const gifts = await this.prisma.gift.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });

    const grouped: Record<string, any[]> = {};
    for (const gift of gifts) {
      if (!grouped[gift.category]) grouped[gift.category] = [];
      grouped[gift.category].push(gift);
    }

    return grouped;
  }

  async sendGift(senderId: string, dto: SendGiftDto) {
    // Idempotency lock — prevents duplicate sends within 10s window
    const dedupeKey = `gift:send:${senderId}:${dto.giftId}:${dto.receiverId ?? ''}:${dto.roomId ?? ''}`;
    const acquired = await this.redis.set(dedupeKey, '1', 'EX', 10, 'NX');
    if (!acquired) {
      throw new BadRequestException('Gift send in progress, please wait a moment');
    }

    try {
      const gift = await this.prisma.gift.findUnique({ where: { id: dto.giftId } });
      if (!gift || !gift.isActive) throw new NotFoundException('Gift not found');

      const quantity = dto.quantity || 1;
      const totalCoins = gift.coinPrice * quantity;

      // Lucky gift: multiplier computed server-side only
      let multiplier = 1;
      if (gift.category === 'LUCKY') {
        multiplier = [1, 2, 5, 10][Math.floor(Math.random() * 4)];
      }
      const totalDiamonds = Math.floor(totalCoins * 0.7) * multiplier || gift.diamondPrice * quantity * multiplier;

      // Single atomic Prisma interactive transaction covering all wallet + record ops
      const result = await this.prisma.$transaction(
        async (tx) => {
          // 1. Check & deduct sender coins
          if (totalCoins > 0) {
            const senderWallet = await tx.wallet.findUnique({ where: { userId: senderId } });
            if (!senderWallet || senderWallet.coins < totalCoins) {
              throw new BadRequestException('Insufficient coins');
            }

            await tx.wallet.update({
              where: { userId: senderId },
              data: { coins: { decrement: totalCoins } },
            });

            await tx.transaction.create({
              data: {
                userId: senderId,
                type: TransactionType.GIFT_SEND,
                currency: Currency.COINS,
                amount: -totalCoins,
                balanceBefore: Number(senderWallet.coins),
                balanceAfter: Number(senderWallet.coins) - totalCoins,
                description: `Gift: ${gift.name} x${quantity}`,
                referenceId: dto.giftId,
                status: TransactionStatus.COMPLETED,
              },
            });
          }

          // 2. Credit receiver diamonds
          if (dto.receiverId && totalDiamonds > 0) {
            const receiverWallet = await tx.wallet.findUnique({
              where: { userId: dto.receiverId },
            });
            const beforeDiamonds = Number(receiverWallet?.diamonds ?? 0);

            await tx.wallet.update({
              where: { userId: dto.receiverId },
              data: {
                diamonds: { increment: totalDiamonds },
                totalEarned: { increment: totalDiamonds },
              },
            });

            await tx.transaction.create({
              data: {
                userId: dto.receiverId,
                type: TransactionType.GIFT_RECEIVE,
                currency: Currency.DIAMONDS,
                amount: totalDiamonds,
                balanceBefore: beforeDiamonds,
                balanceAfter: beforeDiamonds + totalDiamonds,
                description: `Gift received: ${gift.name}`,
                referenceId: senderId,
                status: TransactionStatus.COMPLETED,
              },
            });
          }

          // 3. Record gift transaction
          const giftTx = await tx.giftTransaction.create({
            data: {
              senderId,
              receiverId: dto.receiverId,
              roomId: dto.roomId,
              giftId: dto.giftId,
              quantity,
              totalCoins,
              totalDiamonds,
              message: dto.message,
              multiplier,
            },
            include: {
              gift: true,
              sender: {
                select: {
                  id: true,
                  uid: true,
                  displayName: true,
                  avatar: true,
                  isVip: true,
                  vipLevel: true,
                },
              },
              receiver: {
                select: { id: true, uid: true, displayName: true, avatar: true },
              },
            },
          });

          // 4. Update room gift total
          if (dto.roomId) {
            await tx.voiceRoom.update({
              where: { id: dto.roomId },
              data: { totalGifts: { increment: totalCoins } },
            });
          }

          return giftTx;
        },
        { timeout: 15000 },
      );

      return result;
    } finally {
      await this.redis.del(dedupeKey);
    }
  }

  async getGiftHistory(
    userId: string,
    type: 'sent' | 'received' = 'sent',
    page = 1,
    limit = 20,
  ) {
    const where = type === 'sent' ? { senderId: userId } : { receiverId: userId };

    const [data, total] = await Promise.all([
      this.prisma.giftTransaction.findMany({
        where,
        include: {
          gift: true,
          sender: {
            select: { id: true, uid: true, displayName: true, avatar: true },
          },
          receiver: {
            select: { id: true, uid: true, displayName: true, avatar: true },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.giftTransaction.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async getTopGifters(roomId?: string, limit = 10) {
    const where = roomId ? { roomId } : {};
    return this.prisma.giftTransaction.groupBy({
      by: ['senderId'],
      where,
      _sum: { totalCoins: true },
      orderBy: { _sum: { totalCoins: 'desc' } },
      take: limit,
    });
  }

  async getTopReceivers(roomId?: string, limit = 10) {
    const where = roomId ? { roomId } : {};
    return this.prisma.giftTransaction.groupBy({
      by: ['receiverId'],
      where,
      _sum: { totalDiamonds: true },
      orderBy: { _sum: { totalDiamonds: 'desc' } },
      take: limit,
    });
  }
}
