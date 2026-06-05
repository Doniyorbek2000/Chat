import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const ROOM_CATEGORIES = [
  { key: 'hissa', label: 'Hissa', icon: 'gift', color: '#FF6B6B' },
  { key: 'joziba', label: 'Joziba', icon: 'sparkles', color: '#FFD93D' },
  { key: 'xona', label: 'Xona', icon: 'home', color: '#6BCB77' },
  { key: 'juftlik', label: 'Juftlik', icon: 'heart', color: '#FF6EB4' },
];

@Injectable()
export class HomeService {
  constructor(private prisma: PrismaService) {}

  async getSummary(userId: string) {
    const [user, unreadNotifications] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, displayName: true, avatar: true, level: true, vipLevel: true },
      }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);
    return { user, unreadNotifications };
  }

  async getBanners(placement = 'HOME', country?: string) {
    const now = new Date();
    const banners = await this.prisma.banner.findMany({
      where: {
        isActive: true,
        position: placement,
        OR: [{ startDate: null }, { startDate: { lte: now } }],
        AND: [
          { OR: [{ endDate: null }, { endDate: { gte: now } }] },
        ],
      },
      orderBy: { sortOrder: 'asc' },
    });
    return banners;
  }

  async getCategories() {
    return ROOM_CATEGORIES;
  }
}
