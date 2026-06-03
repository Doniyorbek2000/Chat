import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';

@Injectable()
export class EventsService {
  constructor(
    private prisma: PrismaService,
    private wallet: WalletService,
  ) {}

  async getActiveEvents() {
    const now = new Date();
    return this.prisma.event.findMany({
      where: { isActive: true, startDate: { lte: now }, endDate: { gte: now } },
      orderBy: { startDate: 'asc' },
    });
  }

  async getAllEvents() {
    return this.prisma.event.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async getUpcomingEvents() {
    const now = new Date();
    return this.prisma.event.findMany({
      where: { startDate: { gt: now } },
      orderBy: { startDate: 'asc' },
    });
  }

  async getCompletedEvents() {
    const now = new Date();
    return this.prisma.event.findMany({
      where: { endDate: { lt: now } },
      orderBy: { endDate: 'desc' },
    });
  }

  async getEvent(id: string) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  async createEvent(data: any) {
    return this.prisma.event.create({ data });
  }

  async updateEvent(id: string, data: any) {
    return this.prisma.event.update({ where: { id }, data });
  }

  async getEventLeaderboard(eventId: string, page = 1, limit = 50) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!event) throw new NotFoundException('Event not found');

    // Get top gifters during event period
    const leaderboard = await this.prisma.giftTransaction.groupBy({
      by: ['senderId'],
      where: {
        createdAt: { gte: event.startDate, lte: event.endDate },
      },
      _sum: { totalCoins: true },
      orderBy: { _sum: { totalCoins: 'desc' } },
      skip: (page - 1) * limit,
      take: limit,
    });

    return leaderboard;
  }

  async claimEventReward(userId: string, eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!event) throw new NotFoundException('Event not found');
    if (!event.isActive) throw new BadRequestException('Event is not active');

    const rewards = event.rewards as any;
    if (!rewards?.participation)
      throw new BadRequestException('No rewards available');

    await this.wallet.addCoins(
      userId,
      rewards.participation.coins || 100,
      `Event reward: ${event.name}`,
      eventId,
    );
    return { message: 'Reward claimed', reward: rewards.participation };
  }
}
