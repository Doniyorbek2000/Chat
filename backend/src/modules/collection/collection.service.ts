import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ShopCategory, AssetGrade } from '@prisma/client';

@Injectable()
export class CollectionService {
  constructor(private prisma: PrismaService) {}

  async getMyCollection(userId: string) {
    const [
      shopItems,
      vehicles,
      medals,
      nameplates,
      roomThemes,
    ] = await Promise.all([
      this.prisma.userShopItem.findMany({
        where: { userId },
        include: { item: true },
        orderBy: { purchasedAt: 'desc' },
      }),
      this.prisma.userVehicle.findMany({
        where: { userId },
        include: { vehicle: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.userMedal.findMany({
        where: { userId },
        include: { medal: true },
        orderBy: { unlockedAt: 'desc' },
      }),
      this.prisma.userNameplate.findMany({
        where: { userId },
        include: { nameplate: true },
        orderBy: { purchasedAt: 'desc' },
      }),
      this.prisma.userRoomTheme.findMany({
        where: { userId },
        include: { theme: true },
        orderBy: { purchasedAt: 'desc' },
      }),
    ]);

    // Group shop items by category
    const shopByCategory: Record<string, typeof shopItems> = {};
    for (const ui of shopItems) {
      const cat = ui.item.category;
      if (!shopByCategory[cat]) shopByCategory[cat] = [];
      shopByCategory[cat].push(ui);
    }

    // Count by grade for shop items
    const shopGradeCounts: Record<string, number> = {};
    for (const ui of shopItems) {
      const g = ui.item.grade;
      shopGradeCounts[g] = (shopGradeCounts[g] || 0) + 1;
    }

    // Count medals by grade
    const medalGradeCounts: Record<string, number> = {};
    for (const um of medals) {
      const g = um.medal.grade;
      medalGradeCounts[g] = (medalGradeCounts[g] || 0) + 1;
    }

    return {
      shopItems: {
        total: shopItems.length,
        byCategory: shopByCategory,
        byGrade: shopGradeCounts,
      },
      vehicles: {
        total: vehicles.length,
        items: vehicles,
      },
      medals: {
        total: medals.length,
        byGrade: medalGradeCounts,
        items: medals,
      },
      nameplates: {
        total: nameplates.length,
        items: nameplates,
      },
      roomThemes: {
        total: roomThemes.length,
        items: roomThemes,
      },
    };
  }

  async getAssets(userId: string, category?: ShopCategory, grade?: AssetGrade) {
    // Shop items filtered
    const shopWhere: any = { userId };
    if (category || grade) {
      shopWhere.item = {};
      if (category) shopWhere.item.category = category;
      if (grade) shopWhere.item.grade = grade;
    }

    const shopItems = await this.prisma.userShopItem.findMany({
      where: shopWhere,
      include: { item: true },
      orderBy: { purchasedAt: 'desc' },
    });

    // Medals filtered by grade
    const medalWhere: any = { userId };
    if (grade) {
      medalWhere.medal = { grade };
    }
    const medals = await this.prisma.userMedal.findMany({
      where: medalWhere,
      include: { medal: true },
      orderBy: { unlockedAt: 'desc' },
    });

    // Nameplates filtered by grade
    const nameplateWhere: any = { userId };
    if (grade) {
      nameplateWhere.nameplate = { grade };
    }
    const nameplates = await this.prisma.userNameplate.findMany({
      where: nameplateWhere,
      include: { nameplate: true },
      orderBy: { purchasedAt: 'desc' },
    });

    // Room themes filtered by grade
    const themeWhere: any = { userId };
    if (grade) {
      themeWhere.theme = { grade };
    }
    const roomThemes = await this.prisma.userRoomTheme.findMany({
      where: themeWhere,
      include: { theme: true },
      orderBy: { purchasedAt: 'desc' },
    });

    return {
      shopItems,
      medals,
      nameplates,
      roomThemes,
    };
  }
}
