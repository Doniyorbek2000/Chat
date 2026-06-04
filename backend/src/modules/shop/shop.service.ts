import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { ShopCategory, AssetGrade } from '@prisma/client';
import * as dayjs from 'dayjs';

@Injectable()
export class ShopService {
  constructor(
    private prisma: PrismaService,
    private wallet: WalletService,
  ) {}

  async getItems(category?: ShopCategory, grade?: AssetGrade, userId?: string) {
    const items = await this.prisma.shopItem.findMany({
      where: {
        isActive: true,
        ...(category ? { category } : {}),
        ...(grade ? { grade } : {}),
      },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });

    if (!userId) return items;

    const userItems = await this.prisma.userShopItem.findMany({
      where: { userId, itemId: { in: items.map((i) => i.id) } },
    });
    const ownedMap = new Map(userItems.map((ui) => [ui.itemId, ui]));

    return items.map((item) => ({
      ...item,
      owned: ownedMap.has(item.id),
      userItem: ownedMap.get(item.id) ?? null,
    }));
  }

  async getItem(id: string, userId?: string) {
    const item = await this.prisma.shopItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Shop item not found');

    if (!userId) return item;

    const userItem = await this.prisma.userShopItem.findUnique({
      where: { userId_itemId: { userId, itemId: id } },
    });

    return { ...item, owned: !!userItem, userItem: userItem ?? null };
  }

  async getMyItems(userId: string, category?: ShopCategory) {
    const where: any = { userId };
    if (category) {
      where.item = { category };
    }

    return this.prisma.userShopItem.findMany({
      where,
      include: { item: true },
      orderBy: { purchasedAt: 'desc' },
    });
  }

  async buyItem(userId: string, itemId: string) {
    const item = await this.prisma.shopItem.findUnique({ where: { id: itemId } });
    if (!item || !item.isActive) throw new NotFoundException('Shop item not found');

    // Check level requirement
    if (item.levelRequired > 0 || item.vipRequired > 0) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { level: true, vipLevel: true },
      });
      if (!user) throw new NotFoundException('User not found');
      if (item.levelRequired > 0 && (user.level ?? 0) < item.levelRequired) {
        throw new BadRequestException(`Level ${item.levelRequired} required`);
      }
      if (item.vipRequired > 0 && (user.vipLevel ?? 0) < item.vipRequired) {
        throw new BadRequestException(`VIP level ${item.vipRequired} required`);
      }
    }

    // Check existing ownership
    const existing = await this.prisma.userShopItem.findUnique({
      where: { userId_itemId: { userId, itemId } },
    });

    if (existing) {
      // Allow re-purchase only if expired
      if (!existing.expiresAt || new Date() <= existing.expiresAt) {
        throw new BadRequestException('You already own this item');
      }
    }

    const useDiamonds = item.priceDiamonds > 0 && item.priceCoins === 0;

    if (useDiamonds) {
      await this.wallet.deductDiamonds(
        userId,
        item.priceDiamonds,
        `Shop purchase: ${item.title}`,
      );
    } else {
      await this.wallet.deductCoins(
        userId,
        item.priceCoins,
        `Shop purchase: ${item.title}`,
        itemId,
      );
    }

    const expiresAt = item.durationDays
      ? dayjs().add(item.durationDays, 'day').toDate()
      : undefined;

    const [userItem, purchase] = await this.prisma.$transaction([
      this.prisma.userShopItem.upsert({
        where: { userId_itemId: { userId, itemId } },
        update: { purchasedAt: new Date(), expiresAt: expiresAt ?? null, isEquipped: false },
        create: { userId, itemId, expiresAt: expiresAt ?? null },
        include: { item: true },
      }),
      this.prisma.shopPurchase.create({
        data: {
          userId,
          itemId,
          priceCoins: useDiamonds ? 0 : item.priceCoins,
          priceDiamonds: useDiamonds ? item.priceDiamonds : 0,
        },
      }),
    ]);

    return { userItem, purchase };
  }

  async equipItem(userId: string, itemId: string) {
    const userItem = await this.prisma.userShopItem.findUnique({
      where: { userId_itemId: { userId, itemId } },
      include: { item: true },
    });
    if (!userItem) throw new NotFoundException('You do not own this item');
    if (userItem.expiresAt && new Date() > userItem.expiresAt) {
      throw new BadRequestException('Item has expired');
    }

    const category = userItem.item.category;

    await this.prisma.userShopItem.updateMany({
      where: {
        userId,
        isEquipped: true,
        item: { category },
      },
      data: { isEquipped: false },
    });

    return this.prisma.userShopItem.update({
      where: { userId_itemId: { userId, itemId } },
      data: { isEquipped: true },
      include: { item: true },
    });
  }

  async unequipItem(userId: string, itemId: string) {
    const userItem = await this.prisma.userShopItem.findUnique({
      where: { userId_itemId: { userId, itemId } },
    });
    if (!userItem) throw new NotFoundException('You do not own this item');

    return this.prisma.userShopItem.update({
      where: { userId_itemId: { userId, itemId } },
      data: { isEquipped: false },
    });
  }

  async sendItem(senderId: string, itemId: string, receiverId: string, message?: string) {
    const item = await this.prisma.shopItem.findUnique({ where: { id: itemId } });
    if (!item || !item.isActive) throw new NotFoundException('Shop item not found');

    const receiver = await this.prisma.user.findUnique({ where: { id: receiverId } });
    if (!receiver) throw new NotFoundException('Receiver not found');
    if (receiver.id === senderId) throw new BadRequestException('Cannot send item to yourself');

    const useDiamonds = item.priceDiamonds > 0 && item.priceCoins === 0;

    if (useDiamonds) {
      await this.wallet.deductDiamonds(
        senderId,
        item.priceDiamonds,
        `Send shop item: ${item.title} to ${receiverId}`,
      );
    } else {
      await this.wallet.deductCoins(
        senderId,
        item.priceCoins,
        `Send shop item: ${item.title} to ${receiverId}`,
        itemId,
      );
    }

    const expiresAt = item.durationDays
      ? dayjs().add(item.durationDays, 'day').toDate()
      : undefined;

    return this.prisma.userShopItem.upsert({
      where: { userId_itemId: { userId: receiverId, itemId } },
      update: { purchasedAt: new Date(), expiresAt: expiresAt ?? null },
      create: { userId: receiverId, itemId, expiresAt: expiresAt ?? null },
      include: { item: true },
    });
  }
}
