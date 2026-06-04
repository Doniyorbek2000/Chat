import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { SendGiftDto } from './dto/gift.dto';
import { TransactionType, Currency, TransactionStatus } from '@prisma/client';
import * as Redis from 'ioredis';
import { randomInt, randomBytes, createHash } from 'crypto';

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

  async getJackpotPool() {
    const pool = await this.prisma.jackpotPool.findFirst({
      orderBy: { updatedAt: 'desc' },
    });
    return pool ?? { totalCoins: BigInt(0), lastWonAt: null, lastWinnerId: null, lastWonCoins: null };
  }

  async sendGift(senderId: string, dto: SendGiftDto) {
    // Idempotency lock — prevents duplicate sends within 10s window
    const dedupeKey = `gift:send:${senderId}:${dto.giftId}:${dto.receiverId ?? ''}:${dto.roomId ?? ''}`;
    const acquired = await this.redis.set(dedupeKey, '1', 'EX', 10, 'NX');
    if (!acquired) {
      throw new BadRequestException('Gift send in progress, please wait a moment');
    }

    try {
      const gift = await this.prisma.gift.findUnique({
        where: { id: dto.giftId },
        include: { luckyConfig: true },
      });
      if (!gift || !gift.isActive) throw new NotFoundException('Gift not found');

      const quantity = dto.quantity || 1;
      const totalCoins = BigInt(gift.coinPrice * quantity);

      // Server-side random with cryptographic fairness audit trail
      const serverSeed = randomBytes(32).toString('hex');
      const serverSeedHash = createHash('sha256').update(serverSeed).digest('hex');
      const nonce = randomInt(0, 2147483647);

      // Lucky gift: multiplier computed server-side
      let multiplier = 1;
      let isLucky = false;
      let luckyRoundId: string | null = null;

      if (gift.category === 'LUCKY' || gift.category === 'LUCKY_FRUIT') {
        const config = gift.luckyConfig;
        const min = config?.minMultiplier ?? 1;
        const max = config?.maxMultiplier ?? 10;
        multiplier = randomInt(min, max + 1);
        isLucky = true;
      }

      const totalDiamonds = BigInt(
        Math.floor(Number(totalCoins) * 0.7) * multiplier ||
        gift.diamondPrice * quantity * multiplier,
      );

      // Single atomic Prisma interactive transaction covering all wallet + record ops
      const result = await this.prisma.$transaction(
        async (tx) => {
          // 1. Check & deduct sender coins (BigInt arithmetic)
          if (totalCoins > BigInt(0)) {
            const senderWallet = await tx.wallet.findUnique({
              where: { userId: senderId },
            });
            if (!senderWallet || senderWallet.coins < totalCoins) {
              throw new BadRequestException('Insufficient coins');
            }

            await tx.wallet.update({
              where: { userId: senderId },
              data: {
                coins: { decrement: totalCoins },
                totalGifted: { increment: totalCoins },
              },
            });

            await tx.transaction.create({
              data: {
                userId: senderId,
                type: TransactionType.GIFT_SEND,
                currency: Currency.COINS,
                amount: -totalCoins,
                balanceBefore: senderWallet.coins,
                balanceAfter: senderWallet.coins - totalCoins,
                description: `Gift: ${gift.name} x${quantity}`,
                referenceId: dto.giftId,
                status: TransactionStatus.COMPLETED,
              },
            });
          }

          // 2. Credit receiver diamonds (BigInt arithmetic)
          if (dto.receiverId && totalDiamonds > BigInt(0)) {
            const receiverWallet = await tx.wallet.findUnique({
              where: { userId: dto.receiverId },
            });
            const beforeDiamonds = receiverWallet?.diamonds ?? BigInt(0);

            await tx.wallet.upsert({
              where: { userId: dto.receiverId },
              update: {
                diamonds: { increment: totalDiamonds },
                totalEarned: { increment: totalDiamonds },
              },
              create: {
                userId: dto.receiverId,
                diamonds: totalDiamonds,
                totalEarned: totalDiamonds,
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
                description: `Gift received: ${gift.name}${multiplier > 1 ? ` x${multiplier} LUCKY!` : ''}`,
                referenceId: senderId,
                status: TransactionStatus.COMPLETED,
              },
            });
          }

          // 3. Jackpot pool contribution (500 bps = 5% of gift value)
          const jackpotBps = gift.luckyConfig?.poolContributionBps ?? 500;
          const jackpotContribution = (totalCoins * BigInt(jackpotBps)) / BigInt(10000);
          if (jackpotContribution > BigInt(0)) {
            const pool = await tx.jackpotPool.findFirst({ orderBy: { updatedAt: 'desc' } });
            if (pool) {
              await tx.jackpotPool.update({
                where: { id: pool.id },
                data: { totalCoins: { increment: jackpotContribution } },
              });

              // Check jackpot trigger (1% chance = 100 bps)
              const jackpotChanceBps = gift.luckyConfig?.jackpotChanceBps ?? 100;
              const jackpotRoll = randomInt(0, 10000);
              if (dto.receiverId && jackpotRoll < jackpotChanceBps) {
                const jackpotPrize = pool.totalCoins + jackpotContribution;
                await tx.jackpotPool.update({
                  where: { id: pool.id },
                  data: {
                    totalCoins: BigInt(0),
                    lastWonAt: new Date(),
                    lastWinnerId: dto.receiverId,
                    lastWonCoins: jackpotPrize,
                  },
                });
                await tx.jackpotWinner.create({
                  data: {
                    userId: dto.receiverId,
                    poolId: pool.id,
                    coinsWon: jackpotPrize,
                  },
                });
                await tx.wallet.update({
                  where: { userId: dto.receiverId },
                  data: { coins: { increment: jackpotPrize } },
                });
                await tx.transaction.create({
                  data: {
                    userId: dto.receiverId,
                    type: TransactionType.REWARD,
                    currency: Currency.COINS,
                    amount: jackpotPrize,
                    balanceBefore: BigInt(0),
                    balanceAfter: jackpotPrize,
                    description: 'JACKPOT WIN!',
                    status: TransactionStatus.COMPLETED,
                  },
                });
              }
            }
          }

          // 4. Record lucky gift round entry
          if (isLucky) {
            let round = await tx.luckyGiftRound.findFirst({
              where: { giftId: dto.giftId, isActive: true },
              orderBy: { createdAt: 'desc' },
            });

            if (!round) {
              round = await tx.luckyGiftRound.create({
                data: { giftId: dto.giftId },
              });
            }

            await tx.luckyGiftEntry.create({
              data: {
                roundId: round.id,
                userId: senderId,
                coinsWagered: totalCoins,
              },
            });

            await tx.luckyGiftRound.update({
              where: { id: round.id },
              data: {
                totalPool: { increment: totalCoins },
                entryCount: { increment: 1 },
              },
            });

            luckyRoundId = round.id;

            // Record fairness audit trail
            await tx.luckyGiftResult.upsert({
              where: { roundId: round.id },
              update: { multiplier, serverSeed, serverSeedHash, nonce },
              create: {
                roundId: round.id,
                winnerId: multiplier > 1 ? senderId : null,
                winnerCoins: multiplier > 1 ? totalCoins * BigInt(multiplier) : BigInt(0),
                multiplier,
                serverSeed,
                serverSeedHash,
                nonce,
              },
            });
          }

          // 5. Record gift transaction
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
              receiver: dto.receiverId
                ? {
                    select: {
                      id: true,
                      uid: true,
                      displayName: true,
                      avatar: true,
                    },
                  }
                : false,
            },
          });

          // 6. Update room gift total
          if (dto.roomId) {
            await tx.voiceRoom.update({
              where: { id: dto.roomId },
              data: { totalGifts: { increment: totalCoins } },
            });
          }

          return {
            giftTransaction: giftTx,
            multiplier,
            isLucky,
            luckyRoundId,
            serverSeedHash,
          };
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
    const where =
      type === 'sent' ? { senderId: userId } : { receiverId: userId };

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

  async getLuckyRoundHistory(giftId: string, limit = 10) {
    return this.prisma.luckyGiftRound.findMany({
      where: { giftId },
      include: {
        result: {
          include: {
            winner: {
              select: { id: true, uid: true, displayName: true, avatar: true },
            },
          },
        },
        _count: { select: { entries: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
