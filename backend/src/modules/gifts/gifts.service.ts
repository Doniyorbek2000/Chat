import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { SendGiftDto } from './dto/gift.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class GiftsService {
  constructor(
    private prisma: PrismaService,
    private wallet: WalletService,
  ) {}

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
    const gift = await this.prisma.gift.findUnique({ where: { id: dto.giftId } });
    if (!gift || !gift.isActive) throw new NotFoundException('Gift not found');

    const quantity = dto.quantity || 1;
    const totalCoins = gift.coinPrice * quantity;
    const totalDiamonds = gift.diamondPrice * quantity;

    // Handle lucky gift (random multiplier)
    let actualDiamonds = totalDiamonds;
    if (gift.category === 'LUCKY') {
      const multiplier = [1, 2, 5, 10][Math.floor(Math.random() * 4)];
      actualDiamonds = totalDiamonds * multiplier;
    }

    // Deduct coins from sender
    if (totalCoins > 0) {
      await this.wallet.deductCoins(senderId, totalCoins, `Gift: ${gift.name} x${quantity}`, dto.giftId);
    }

    // Add diamonds to receiver (70% of coin value as diamonds)
    const diamondsToReceive = Math.floor(totalCoins * 0.7) || actualDiamonds;
    if (dto.receiverId) {
      await this.wallet.addDiamonds(dto.receiverId, diamondsToReceive, `Gift received: ${gift.name}`, senderId);
    }

    // Record transaction
    const tx = await this.prisma.giftTransaction.create({
      data: {
        senderId,
        receiverId: dto.receiverId,
        roomId: dto.roomId,
        giftId: dto.giftId,
        quantity,
        totalCoins,
        totalDiamonds: diamondsToReceive,
        message: dto.message,
      },
      include: {
        gift: true,
        sender: { select: { id: true, uid: true, displayName: true, avatar: true, isVip: true, vipLevel: true } },
        receiver: { select: { id: true, uid: true, displayName: true, avatar: true } },
      },
    });

    // Update room gift total
    if (dto.roomId) {
      await this.prisma.voiceRoom.update({
        where: { id: dto.roomId },
        data: { totalGifts: { increment: totalCoins } },
      });
    }

    return tx;
  }

  async getGiftHistory(userId: string, type: 'sent' | 'received' = 'sent', page = 1, limit = 20) {
    const where = type === 'sent' ? { senderId: userId } : { receiverId: userId };

    const [data, total] = await Promise.all([
      this.prisma.giftTransaction.findMany({
        where,
        include: {
          gift: true,
          sender: { select: { id: true, uid: true, displayName: true, avatar: true } },
          receiver: { select: { id: true, uid: true, displayName: true, avatar: true } },
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
