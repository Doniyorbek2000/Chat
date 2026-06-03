import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CoupleStatus, CoupleRequestStatus } from '@prisma/client';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';

@Injectable()
export class CoupleService {
  private readonly logger = new Logger(CoupleService.name);

  constructor(
    private prisma: PrismaService,
    @InjectRedis() private redis: Redis,
  ) {}

  async sendCoupleRequest(
    senderId: string,
    receiverId: string,
    message?: string,
  ) {
    if (senderId === receiverId) {
      throw new BadRequestException('Cannot send couple request to yourself');
    }

    const receiver = await this.prisma.user.findUnique({
      where: { id: receiverId },
    });
    if (!receiver) throw new NotFoundException('User not found');

    const existingCouple = await this.prisma.couple.findFirst({
      where: {
        OR: [
          { user1Id: senderId, status: CoupleStatus.ACTIVE },
          { user2Id: senderId, status: CoupleStatus.ACTIVE },
        ],
      },
    });

    if (existingCouple) {
      throw new BadRequestException('You are already in a couple relationship');
    }

    const receiverCouple = await this.prisma.couple.findFirst({
      where: {
        OR: [
          { user1Id: receiverId, status: CoupleStatus.ACTIVE },
          { user2Id: receiverId, status: CoupleStatus.ACTIVE },
        ],
      },
    });

    if (receiverCouple) {
      throw new BadRequestException(
        'This user is already in a couple relationship',
      );
    }

    const existingRequest = await this.prisma.coupleRequest.findFirst({
      where: {
        OR: [
          { senderId, receiverId, status: CoupleRequestStatus.PENDING },
          {
            senderId: receiverId,
            receiverId: senderId,
            status: CoupleRequestStatus.PENDING,
          },
        ],
      },
    });

    if (existingRequest) {
      throw new ConflictException(
        'A pending request already exists between you two',
      );
    }

    return this.prisma.coupleRequest.create({
      data: { senderId, receiverId, message },
      include: {
        sender: {
          select: { id: true, uid: true, displayName: true, avatar: true },
        },
        receiver: {
          select: { id: true, uid: true, displayName: true, avatar: true },
        },
      },
    });
  }

  async acceptRequest(userId: string, requestId: string) {
    const request = await this.prisma.coupleRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) throw new NotFoundException('Request not found');
    if (request.receiverId !== userId)
      throw new ForbiddenException('Not authorized');
    if (request.status !== CoupleRequestStatus.PENDING) {
      throw new BadRequestException('Request is no longer pending');
    }

    await this.prisma.coupleRequest.update({
      where: { id: requestId },
      data: { status: CoupleRequestStatus.ACCEPTED },
    });

    const couple = await this.prisma.couple.create({
      data: {
        user1Id: request.senderId,
        user2Id: request.receiverId,
        status: CoupleStatus.ACTIVE,
        anniversaryDate: new Date(),
      },
      include: {
        user1: {
          select: { id: true, uid: true, displayName: true, avatar: true },
        },
        user2: {
          select: { id: true, uid: true, displayName: true, avatar: true },
        },
      },
    });

    await this.prisma.coupleRequest.updateMany({
      where: {
        OR: [
          { senderId: request.senderId },
          { receiverId: request.senderId },
          { senderId: request.receiverId },
          { receiverId: request.receiverId },
        ],
        status: CoupleRequestStatus.PENDING,
        NOT: { id: requestId },
      },
      data: { status: CoupleRequestStatus.REJECTED },
    });

    return couple;
  }

  async rejectRequest(userId: string, requestId: string) {
    const request = await this.prisma.coupleRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) throw new NotFoundException('Request not found');
    if (request.receiverId !== userId)
      throw new ForbiddenException('Not authorized');

    return this.prisma.coupleRequest.update({
      where: { id: requestId },
      data: { status: CoupleRequestStatus.REJECTED },
    });
  }

  async endCouple(userId: string, coupleId: string, reason?: string) {
    const couple = await this.prisma.couple.findUnique({
      where: { id: coupleId },
    });
    if (!couple) throw new NotFoundException('Couple not found');

    if (couple.user1Id !== userId && couple.user2Id !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    if (couple.status !== CoupleStatus.ACTIVE) {
      throw new BadRequestException('This couple relationship is not active');
    }

    return this.prisma.couple.update({
      where: { id: coupleId },
      data: {
        status: CoupleStatus.ENDED,
        endedAt: new Date(),
        endedBy: userId,
        endReason: reason,
      },
    });
  }

  async getCoupleInfo(userId: string) {
    const couple = await this.prisma.couple.findFirst({
      where: {
        OR: [
          { user1Id: userId, status: CoupleStatus.ACTIVE },
          { user2Id: userId, status: CoupleStatus.ACTIVE },
        ],
      },
      include: {
        user1: {
          select: {
            id: true,
            uid: true,
            displayName: true,
            avatar: true,
            isVip: true,
            vipLevel: true,
          },
        },
        user2: {
          select: {
            id: true,
            uid: true,
            displayName: true,
            avatar: true,
            isVip: true,
            vipLevel: true,
          },
        },
      },
    });

    if (!couple) {
      return null;
    }

    const anniversaryDays = couple.anniversaryDate
      ? Math.floor(
          (new Date().getTime() - couple.anniversaryDate.getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : 0;

    return { ...couple, anniversaryDays };
  }

  async getCoupleRanking(limit = 50) {
    const key = `couple_ranking`;
    const cached = await this.redis.get(key);

    if (cached) return JSON.parse(cached);

    const couples = await this.prisma.couple.findMany({
      where: { status: CoupleStatus.ACTIVE },
      orderBy: [{ level: 'desc' }, { xp: 'desc' }],
      take: limit,
      include: {
        user1: {
          select: { id: true, uid: true, displayName: true, avatar: true },
        },
        user2: {
          select: { id: true, uid: true, displayName: true, avatar: true },
        },
      },
    });

    await this.redis.set(key, JSON.stringify(couples), 'EX', 300);
    return couples;
  }

  async getCoupleGifts(coupleId: string) {
    const couple = await this.prisma.couple.findUnique({
      where: { id: coupleId },
    });
    if (!couple) throw new NotFoundException('Couple not found');

    return this.prisma.giftTransaction.findMany({
      where: {
        OR: [
          { senderId: couple.user1Id, receiverId: couple.user2Id },
          { senderId: couple.user2Id, receiverId: couple.user1Id },
        ],
      },
      include: {
        gift: true,
        sender: {
          select: { id: true, uid: true, displayName: true, avatar: true },
        },
        receiver: {
          select: { id: true, uid: true, displayName: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getPendingRequests(userId: string) {
    return this.prisma.coupleRequest.findMany({
      where: {
        OR: [
          { receiverId: userId, status: CoupleRequestStatus.PENDING },
          { senderId: userId, status: CoupleRequestStatus.PENDING },
        ],
      },
      include: {
        sender: {
          select: { id: true, uid: true, displayName: true, avatar: true },
        },
        receiver: {
          select: { id: true, uid: true, displayName: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
