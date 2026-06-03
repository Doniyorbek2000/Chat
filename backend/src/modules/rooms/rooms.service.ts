import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoomDto, UpdateRoomDto } from './dto/room.dto';
import { RoomType, RoomMemberRole } from '@prisma/client';
import { ZegocloudService } from '../zegocloud/zegocloud.service';
import * as Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RoomsService {
  private redis: Redis.Redis;

  constructor(
    private prisma: PrismaService,
    private zegocloud: ZegocloudService,
    private config: ConfigService,
  ) {
    this.redis = new Redis.Redis(
      this.config.get<string>('redis.url') || 'redis://localhost:6379',
    );
  }

  async createRoom(hostId: string, dto: CreateRoomDto) {
    const room = await this.prisma.voiceRoom.create({
      data: {
        hostId,
        title: dto.title,
        description: dto.description,
        coverImage: dto.coverImage,
        type: dto.type as RoomType,
        password: dto.password,
        maxSeats: dto.maxSeats || 8,
        tags: dto.tags || [],
        language: dto.language,
        announcement: dto.announcement,
        isLive: true,
        seats: {
          create: {
            position: 1,
            userId: hostId,
          },
        },
        members: {
          create: {
            userId: hostId,
            role: RoomMemberRole.HOST,
          },
        },
      },
      include: {
        host: {
          select: {
            id: true,
            uid: true,
            displayName: true,
            avatar: true,
            isVip: true,
            vipLevel: true,
          },
        },
        seats: { include: { user: true } },
      },
    });

    // Cache live room in Redis
    await this.redis.setex(
      `room:live:${room.id}`,
      3600,
      JSON.stringify({ id: room.id, title: room.title }),
    );
    await this.redis.sadd('rooms:live', room.id);

    return room;
  }

  async getRooms(filters: {
    type?: string;
    language?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { type, language, search, page = 1, limit = 20 } = filters;

    const where: any = { isLive: true };
    if (type && type !== 'ALL') where.type = type;
    if (language) where.language = language;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { host: { displayName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.voiceRoom.findMany({
        where,
        include: {
          host: {
            select: {
              id: true,
              uid: true,
              displayName: true,
              avatar: true,
              isVip: true,
              vipLevel: true,
            },
          },
          seats: {
            where: { userId: { not: null } },
            include: {
              user: {
                select: {
                  id: true,
                  displayName: true,
                  avatar: true,
                  isVip: true,
                },
              },
            },
          },
          _count: { select: { members: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [
          { totalGifts: 'desc' },
          { viewerCount: 'desc' },
          { createdAt: 'desc' },
        ],
      }),
      this.prisma.voiceRoom.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async getRoom(roomId: string, userId?: string) {
    const room = await this.prisma.voiceRoom.findUnique({
      where: { id: roomId },
      include: {
        host: {
          select: {
            id: true,
            uid: true,
            displayName: true,
            avatar: true,
            isVip: true,
            vipLevel: true,
          },
        },
        seats: {
          include: {
            user: {
              select: {
                id: true,
                uid: true,
                displayName: true,
                avatar: true,
                isVip: true,
                vipLevel: true,
                level: true,
              },
            },
          },
          orderBy: { position: 'asc' },
        },
        members: {
          where: { leftAt: null },
          include: {
            user: {
              select: { id: true, uid: true, displayName: true, avatar: true },
            },
          },
          take: 50,
        },
      },
    });

    if (!room) throw new NotFoundException('Room not found');

    // Check password for private rooms
    if (room.type === RoomType.PASSWORD && userId !== room.hostId) {
      // Client must provide password separately
    }

    return room;
  }

  async joinRoom(roomId: string, userId: string, password?: string) {
    const room = await this.prisma.voiceRoom.findUnique({
      where: { id: roomId },
    });
    if (!room) throw new NotFoundException('Room not found');
    if (!room.isLive) throw new BadRequestException('Room is not live');

    if (room.type === RoomType.PASSWORD && password !== room.password) {
      throw new ForbiddenException('Incorrect password');
    }

    // Check existing membership
    const existing = await this.prisma.roomMember.findFirst({
      where: { roomId, userId, leftAt: null },
    });

    if (!existing) {
      await this.prisma.$transaction([
        this.prisma.roomMember.create({
          data: { roomId, userId, role: RoomMemberRole.LISTENER },
        }),
        this.prisma.voiceRoom.update({
          where: { id: roomId },
          data: { viewerCount: { increment: 1 } },
        }),
      ]);
    }

    // Generate Zego token
    const token = await this.zegocloud.generateToken(userId, roomId);
    return { room, token };
  }

  async leaveRoom(roomId: string, userId: string) {
    const member = await this.prisma.roomMember.findFirst({
      where: { roomId, userId, leftAt: null },
    });

    if (member) {
      await this.prisma.$transaction([
        this.prisma.roomMember.update({
          where: { id: member.id },
          data: { leftAt: new Date() },
        }),
        this.prisma.voiceRoom.update({
          where: { id: roomId },
          data: { viewerCount: { decrement: 1 } },
        }),
      ]);
    }

    // Free up seat if occupied
    await this.prisma.roomSeat.deleteMany({ where: { roomId, userId } });

    const room = await this.prisma.voiceRoom.findUnique({
      where: { id: roomId },
    });
    // If host left, end room
    if (room?.hostId === userId) {
      await this.closeRoom(roomId);
    }

    return { message: 'Left room' };
  }

  async takeSeat(roomId: string, userId: string, position: number) {
    const room = await this.prisma.voiceRoom.findUnique({
      where: { id: roomId },
      include: { seats: true },
    });
    if (!room) throw new NotFoundException('Room not found');

    const existingSeat = room.seats.find((s) => s.position === position);
    if (existingSeat?.userId) throw new BadRequestException('Seat is taken');
    if (existingSeat?.isLocked) throw new ForbiddenException('Seat is locked');

    if (existingSeat) {
      return this.prisma.roomSeat.update({
        where: { id: existingSeat.id },
        data: { userId, joinedAt: new Date() },
        include: { user: true },
      });
    }

    return this.prisma.roomSeat.create({
      data: { roomId, position, userId },
      include: { user: true },
    });
  }

  async leaveSeat(roomId: string, userId: string) {
    await this.prisma.roomSeat.deleteMany({ where: { roomId, userId } });
    return { message: 'Left seat' };
  }

  async muteUser(roomId: string, adminId: string, targetUserId: string) {
    await this.checkRoomAdmin(roomId, adminId);
    await this.prisma.roomSeat.updateMany({
      where: { roomId, userId: targetUserId },
      data: { isMuted: true },
    });
    return { message: 'User muted' };
  }

  async unmuteUser(roomId: string, adminId: string, targetUserId: string) {
    await this.checkRoomAdmin(roomId, adminId);
    await this.prisma.roomSeat.updateMany({
      where: { roomId, userId: targetUserId },
      data: { isMuted: false },
    });
    return { message: 'User unmuted' };
  }

  async kickUser(roomId: string, adminId: string, targetUserId: string) {
    await this.checkRoomAdmin(roomId, adminId);
    await this.prisma.roomMember.updateMany({
      where: { roomId, userId: targetUserId, leftAt: null },
      data: { leftAt: new Date() },
    });
    await this.prisma.roomSeat.deleteMany({
      where: { roomId, userId: targetUserId },
    });
    await this.prisma.voiceRoom.update({
      where: { id: roomId },
      data: { viewerCount: { decrement: 1 } },
    });
    return { message: 'User kicked' };
  }

  async lockSeat(roomId: string, adminId: string, position: number) {
    await this.checkRoomAdmin(roomId, adminId);
    await this.prisma.roomSeat.upsert({
      where: { roomId_position: { roomId, position } },
      update: { isLocked: true, userId: null },
      create: { roomId, position, isLocked: true },
    });
    return { message: 'Seat locked' };
  }

  async updateAnnouncement(
    roomId: string,
    hostId: string,
    announcement: string,
  ) {
    const room = await this.prisma.voiceRoom.findUnique({
      where: { id: roomId },
    });
    if (!room || room.hostId !== hostId)
      throw new ForbiddenException('Only host can update announcement');

    return this.prisma.voiceRoom.update({
      where: { id: roomId },
      data: { announcement },
    });
  }

  async updateRoom(roomId: string, hostId: string, dto: UpdateRoomDto) {
    const room = await this.prisma.voiceRoom.findUnique({
      where: { id: roomId },
    });
    if (!room || room.hostId !== hostId)
      throw new ForbiddenException('Only host can update room');

    return this.prisma.voiceRoom.update({ where: { id: roomId }, data: dto });
  }

  async closeRoom(roomId: string) {
    await this.prisma.voiceRoom.update({
      where: { id: roomId },
      data: { isLive: false },
    });
    await this.prisma.roomSeat.deleteMany({ where: { roomId } });
    await this.prisma.roomMember.updateMany({
      where: { roomId, leftAt: null },
      data: { leftAt: new Date() },
    });
    await this.redis.srem('rooms:live', roomId);
    await this.redis.del(`room:live:${roomId}`);
  }

  async generateZegoToken(roomId: string, userId: string) {
    const token = await this.zegocloud.generateToken(userId, roomId);
    return { token };
  }

  async getRoomMembers(roomId: string, page = 1, limit = 50) {
    return this.prisma.roomMember.findMany({
      where: { roomId, leftAt: null },
      include: {
        user: {
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
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  private async checkRoomAdmin(roomId: string, userId: string) {
    const room = await this.prisma.voiceRoom.findUnique({
      where: { id: roomId },
    });
    if (!room) throw new NotFoundException('Room not found');

    const member = await this.prisma.roomMember.findFirst({
      where: {
        roomId,
        userId,
        role: {
          in: [
            RoomMemberRole.HOST,
            RoomMemberRole.CO_HOST,
            RoomMemberRole.ADMIN,
          ],
        },
        leftAt: null,
      },
    });

    if (!member && room.hostId !== userId)
      throw new ForbiddenException('Insufficient permissions');
  }
}
