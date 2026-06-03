import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { UpdateProfileDto } from './dto/user.dto';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    @InjectRedis() private redis: Redis,
  ) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        wallet: {
          select: { coins: true, diamonds: true },
        },
        _count: {
          select: {
            followers: true,
            following: true,
            hostedRooms: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByUid(uid: string) {
    const user = await this.prisma.user.findUnique({
      where: { uid },
      include: {
        wallet: {
          select: { coins: true, diamonds: true },
        },
        _count: {
          select: {
            followers: true,
            following: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    if (dto.username) {
      const existing = await this.prisma.user.findFirst({
        where: { username: dto.username, NOT: { id: userId } },
      });
      if (existing) {
        throw new ConflictException('Username already taken');
      }
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
    });
  }

  async uploadAvatar(
    userId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    const key = `avatars/${userId}/${Date.now()}_${file.originalname}`;
    const url = await this.storageService.uploadFile(
      file.buffer,
      key,
      file.mimetype,
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: { avatar: url },
    });

    return url;
  }

  async uploadCover(
    userId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    const key = `covers/${userId}/${Date.now()}_${file.originalname}`;
    const url = await this.storageService.uploadFile(
      file.buffer,
      key,
      file.mimetype,
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: { coverImage: url },
    });

    return url;
  }

  async followUser(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new BadRequestException('Cannot follow yourself');
    }

    const following = await this.prisma.user.findUnique({
      where: { id: followingId },
    });
    if (!following) throw new NotFoundException('User not found');

    const existing = await this.prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });

    if (existing) {
      throw new ConflictException('Already following this user');
    }

    await this.prisma.follow.create({
      data: { followerId, followingId },
    });

    return { message: 'Followed successfully' };
  }

  async unfollowUser(followerId: string, followingId: string) {
    const existing = await this.prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });

    if (!existing) {
      throw new NotFoundException('Not following this user');
    }

    await this.prisma.follow.delete({
      where: { followerId_followingId: { followerId, followingId } },
    });

    return { message: 'Unfollowed successfully' };
  }

  async getFollowers(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [followers, total] = await Promise.all([
      this.prisma.follow.findMany({
        where: { followingId: userId },
        include: {
          follower: {
            select: {
              id: true,
              uid: true,
              displayName: true,
              avatar: true,
              isVip: true,
              vipLevel: true,
              level: true,
              isOnline: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.follow.count({ where: { followingId: userId } }),
    ]);

    return {
      data: followers.map((f) => f.follower),
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async getFollowings(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [followings, total] = await Promise.all([
      this.prisma.follow.findMany({
        where: { followerId: userId },
        include: {
          following: {
            select: {
              id: true,
              uid: true,
              displayName: true,
              avatar: true,
              isVip: true,
              vipLevel: true,
              level: true,
              isOnline: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.follow.count({ where: { followerId: userId } }),
    ]);

    return {
      data: followings.map((f) => f.following),
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async recordVisit(visitorId: string, profileId: string) {
    if (visitorId === profileId) return;

    const key = `visit:${profileId}:${visitorId}`;
    const alreadyVisited = await this.redis.get(key);

    if (!alreadyVisited) {
      await this.redis.lpush(
        `visitors:${profileId}`,
        JSON.stringify({
          visitorId,
          timestamp: Date.now(),
        }),
      );
      await this.redis.ltrim(`visitors:${profileId}`, 0, 99);
      await this.redis.set(key, '1', 'EX', 86400);
    }
  }

  async getVisitors(userId: string) {
    const visitorData = await this.redis.lrange(`visitors:${userId}`, 0, 49);
    const visitors = visitorData.map((v) => JSON.parse(v));

    const visitorIds = [...new Set(visitors.map((v) => v.visitorId))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: visitorIds as string[] } },
      select: {
        id: true,
        uid: true,
        displayName: true,
        avatar: true,
        isVip: true,
        level: true,
        isOnline: true,
      },
    });

    return users;
  }

  async searchUsers(query: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          OR: [
            { username: { contains: query, mode: 'insensitive' } },
            { displayName: { contains: query, mode: 'insensitive' } },
            { uid: { contains: query, mode: 'insensitive' } },
          ],
          isBanned: false,
        },
        select: {
          id: true,
          uid: true,
          username: true,
          displayName: true,
          avatar: true,
          isVip: true,
          vipLevel: true,
          level: true,
          isOnline: true,
          country: true,
        },
        skip,
        take: limit,
      }),
      this.prisma.user.count({
        where: {
          OR: [
            { username: { contains: query, mode: 'insensitive' } },
            { displayName: { contains: query, mode: 'insensitive' } },
            { uid: { contains: query, mode: 'insensitive' } },
          ],
          isBanned: false,
        },
      }),
    ]);

    return {
      data: users,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async getUserStats(userId: string) {
    const [
      followersCount,
      followingCount,
      totalGiftsSent,
      totalGiftsReceived,
      roomsHosted,
    ] = await Promise.all([
      this.prisma.follow.count({ where: { followingId: userId } }),
      this.prisma.follow.count({ where: { followerId: userId } }),
      this.prisma.giftTransaction.aggregate({
        where: { senderId: userId },
        _sum: { totalCoins: true },
      }),
      this.prisma.giftTransaction.aggregate({
        where: { receiverId: userId },
        _sum: { totalCoins: true },
      }),
      this.prisma.voiceRoom.count({ where: { hostId: userId } }),
    ]);

    return {
      followers: followersCount,
      following: followingCount,
      giftsSent: totalGiftsSent._sum.totalCoins || 0,
      giftsReceived: totalGiftsReceived._sum.totalCoins || 0,
      roomsHosted,
    };
  }

  async updateFcmToken(userId: string, fcmToken: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { fcmToken },
    });
  }
}
