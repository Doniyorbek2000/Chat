import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import * as Redis from 'ioredis';

interface AuthSocket extends Socket {
  userId?: string;
  uid?: string;
  user?: any;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: '/rooms',
  transports: ['websocket', 'polling'],
})
@Injectable()
export class RoomsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RoomsGateway.name);
  private userSocketMap = new Map<string, string>();
  private socketUserMap = new Map<string, string>();

  private readonly redis: Redis.Redis;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.redis = new Redis.Redis(
      this.configService.get<string>('redis.url') || 'redis://localhost:6379',
    );
  }

  afterInit(server: Server) {
    this.logger.log('Rooms WebSocket Gateway initialized');
  }

  async handleConnection(client: AuthSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('jwt.secret'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          uid: true,
          displayName: true,
          avatar: true,
          isVip: true,
          vipLevel: true,
          level: true,
        },
      });

      if (!user) {
        client.disconnect();
        return;
      }

      client.userId = user.id;
      client.uid = user.uid;
      client.user = user;

      this.userSocketMap.set(user.id, client.id);
      this.socketUserMap.set(client.id, user.id);

      await this.redis.hset(`online_users`, user.id, client.id);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { isOnline: true },
      });

      this.server.emit('user:online', { userId: user.id, uid: user.uid });
      this.logger.log(`Client connected: ${user.uid} (${client.id})`);
    } catch (error) {
      this.logger.warn(`Connection refused: ${error.message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthSocket) {
    const userId = client.userId || this.socketUserMap.get(client.id);

    if (userId) {
      this.userSocketMap.delete(userId);
      this.socketUserMap.delete(client.id);

      await this.redis.hdel('online_users', userId);
      await this.prisma.user
        .update({
          where: { id: userId },
          data: { isOnline: false, lastSeen: new Date() },
        })
        .catch(() => {});

      // Leave all rooms
      const rooms = await this.redis.smembers(`user_rooms:${userId}`);
      for (const roomId of rooms) {
        await this.handleLeaveRoom(client, { roomId });
      }
      await this.redis.del(`user_rooms:${userId}`);

      this.server.emit('user:offline', { userId });
      this.logger.log(`Client disconnected: ${userId} (${client.id})`);
    }
  }

  @SubscribeMessage('room:join')
  async handleJoinRoom(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { roomId: string; password?: string },
  ) {
    try {
      const userId = client.userId;
      if (!userId) throw new WsException('Unauthorized');

      const room = await this.prisma.voiceRoom.findUnique({
        where: { id: data.roomId },
        include: {
          seats: {
            include: {
              user: {
                select: {
                  id: true,
                  uid: true,
                  displayName: true,
                  avatar: true,
                  isVip: true,
                },
              },
            },
            orderBy: { position: 'asc' },
          },
          host: {
            select: {
              id: true,
              uid: true,
              displayName: true,
              avatar: true,
              isVip: true,
            },
          },
        },
      });

      if (!room || !room.isLive) {
        client.emit('error', { message: 'Room not found or not live' });
        return;
      }

      if (room.type === 'PASSWORD' && room.password !== data.password) {
        client.emit('error', { message: 'Incorrect password' });
        return;
      }

      await client.join(`room:${data.roomId}`);
      await this.redis.sadd(`user_rooms:${userId}`, data.roomId);
      await this.redis.sadd(`room_users:${data.roomId}`, userId);

      client.emit('room:joined', {
        roomId: data.roomId,
        room,
        user: client.user,
      });

      client.to(`room:${data.roomId}`).emit('room:user_joined', {
        roomId: data.roomId,
        user: client.user,
      });

      this.logger.log(`User ${userId} joined room ${data.roomId}`);
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('room:leave')
  async handleLeaveRoom(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { roomId: string },
  ) {
    try {
      const userId = client.userId;
      if (!userId) return;

      await client.leave(`room:${data.roomId}`);
      await this.redis.srem(`user_rooms:${userId}`, data.roomId);
      await this.redis.srem(`room_users:${data.roomId}`, userId);

      client.to(`room:${data.roomId}`).emit('room:user_left', {
        roomId: data.roomId,
        userId,
        user: client.user,
      });

      this.logger.log(`User ${userId} left room ${data.roomId}`);
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('room:seat_take')
  async handleSeatTake(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { roomId: string; position: number },
  ) {
    try {
      const userId = client.userId;
      if (!userId) throw new WsException('Unauthorized');

      // Verify user is a member of this room (joined via room:join)
      const isMember = await this.redis.sismember(
        `room_users:${data.roomId}`,
        userId,
      );
      if (!isMember) {
        client.emit('error', {
          message: 'You must join the room before taking a seat',
        });
        return;
      }

      const seat = await this.prisma.roomSeat.findUnique({
        where: {
          roomId_position: { roomId: data.roomId, position: data.position },
        },
      });

      if (!seat || seat.isLocked) {
        client.emit('error', { message: 'Seat not available' });
        return;
      }

      if (seat.userId) {
        client.emit('error', { message: 'Seat already taken' });
        return;
      }

      const oldSeat = await this.prisma.roomSeat.findFirst({
        where: { roomId: data.roomId, userId },
      });

      if (oldSeat) {
        await this.prisma.roomSeat.update({
          where: { id: oldSeat.id },
          data: { userId: null, isMuted: false, joinedAt: null },
        });
      }

      const updatedSeat = await this.prisma.roomSeat.update({
        where: {
          roomId_position: { roomId: data.roomId, position: data.position },
        },
        data: { userId, joinedAt: new Date() },
        include: {
          user: {
            select: {
              id: true,
              uid: true,
              displayName: true,
              avatar: true,
              isVip: true,
            },
          },
        },
      });

      this.server.to(`room:${data.roomId}`).emit('room:seat_changed', {
        roomId: data.roomId,
        action: 'take',
        seat: updatedSeat,
        userId,
        previousSeat: oldSeat?.position,
      });
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('room:seat_leave')
  async handleSeatLeave(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { roomId: string },
  ) {
    try {
      const userId = client.userId;
      if (!userId) throw new WsException('Unauthorized');

      const seat = await this.prisma.roomSeat.findFirst({
        where: { roomId: data.roomId, userId },
      });

      if (!seat) return;

      await this.prisma.roomSeat.update({
        where: { id: seat.id },
        data: { userId: null, isMuted: false, joinedAt: null },
      });

      this.server.to(`room:${data.roomId}`).emit('room:seat_changed', {
        roomId: data.roomId,
        action: 'leave',
        position: seat.position,
        userId,
      });
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('room:message')
  async handleMessage(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { roomId: string; content: string; type?: string },
  ) {
    try {
      const userId = client.userId;
      if (!userId) throw new WsException('Unauthorized');

      const isMuted = await this.prisma.roomSeat.findFirst({
        where: { roomId: data.roomId, userId, isMuted: true },
      });

      if (isMuted) {
        client.emit('error', { message: 'You are muted' });
        return;
      }

      const message = {
        id: `${Date.now()}_${userId}`,
        roomId: data.roomId,
        userId,
        user: client.user,
        content: data.content,
        type: data.type || 'TEXT',
        timestamp: new Date().toISOString(),
      };

      this.server.to(`room:${data.roomId}`).emit('room:message', message);
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('room:gift')
  async handleGift(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody()
    data: {
      roomId: string;
      giftId: string;
      receiverId: string;
      quantity: number;
      message?: string;
    },
  ) {
    try {
      const senderId = client.userId;
      if (!senderId) throw new WsException('Unauthorized');

      const gift = await this.prisma.gift.findUnique({
        where: { id: data.giftId },
      });
      if (!gift) {
        client.emit('error', { message: 'Gift not found' });
        return;
      }

      const giftEvent = {
        roomId: data.roomId,
        senderId,
        sender: client.user,
        receiverId: data.receiverId,
        gift,
        quantity: data.quantity,
        totalCoins: gift.coinPrice * data.quantity,
        message: data.message,
        timestamp: new Date().toISOString(),
      };

      this.server.to(`room:${data.roomId}`).emit('room:gift', giftEvent);
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('room:pk_update')
  async handlePkUpdate(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody()
    data: {
      pkBattleId: string;
      roomId: string;
      score: number;
    },
  ) {
    try {
      const battle = await this.prisma.pkBattle.findUnique({
        where: { id: data.pkBattleId },
      });

      if (!battle) return;

      this.server.to(`room:${battle.room1Id}`).emit('room:pk_update', {
        pkBattleId: data.pkBattleId,
        room1Score: battle.room1Score,
        room2Score: battle.room2Score,
        status: battle.status,
      });

      this.server.to(`room:${battle.room2Id}`).emit('room:pk_update', {
        pkBattleId: data.pkBattleId,
        room1Score: battle.room1Score,
        room2Score: battle.room2Score,
        status: battle.status,
      });
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('room:announcement')
  async handleAnnouncement(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { roomId: string; announcement: string },
  ) {
    try {
      const userId = client.userId;
      const room = await this.prisma.voiceRoom.findUnique({
        where: { id: data.roomId },
      });

      if (!room || room.hostId !== userId) {
        client.emit('error', { message: 'Unauthorized' });
        return;
      }

      this.server.to(`room:${data.roomId}`).emit('room:announcement', {
        roomId: data.roomId,
        announcement: data.announcement,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('room:kick')
  async handleKick(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { roomId: string; targetUserId: string },
  ) {
    try {
      const adminId = client.userId;
      const room = await this.prisma.voiceRoom.findUnique({
        where: { id: data.roomId },
      });

      if (!room || room.hostId !== adminId) {
        client.emit('error', { message: 'Unauthorized' });
        return;
      }

      const targetSocketId = this.userSocketMap.get(data.targetUserId);

      this.server.to(`room:${data.roomId}`).emit('room:kicked', {
        roomId: data.roomId,
        userId: data.targetUserId,
        kickedBy: adminId,
        timestamp: new Date().toISOString(),
      });

      if (targetSocketId) {
        const targetSocket = this.server.sockets.sockets.get(
          targetSocketId,
        ) as AuthSocket;
        if (targetSocket) {
          await targetSocket.leave(`room:${data.roomId}`);
          targetSocket.emit('room:kicked', {
            roomId: data.roomId,
            reason: 'You have been kicked from this room',
          });
        }
      }
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('room:mute')
  async handleMute(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody()
    data: { roomId: string; targetUserId: string; muted: boolean },
  ) {
    try {
      const adminId = client.userId;
      const room = await this.prisma.voiceRoom.findUnique({
        where: { id: data.roomId },
      });

      if (!room || room.hostId !== adminId) {
        client.emit('error', { message: 'Unauthorized' });
        return;
      }

      await this.prisma.roomSeat.updateMany({
        where: { roomId: data.roomId, userId: data.targetUserId },
        data: { isMuted: data.muted },
      });

      this.server.to(`room:${data.roomId}`).emit('room:muted', {
        roomId: data.roomId,
        userId: data.targetUserId,
        muted: data.muted,
        mutedBy: adminId,
      });
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('room:update')
  async handleRoomUpdate(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { roomId: string; updates: any },
  ) {
    try {
      const userId = client.userId;
      const room = await this.prisma.voiceRoom.findUnique({
        where: { id: data.roomId },
      });

      if (!room || room.hostId !== userId) {
        client.emit('error', { message: 'Unauthorized' });
        return;
      }

      this.server.to(`room:${data.roomId}`).emit('room:updated', {
        roomId: data.roomId,
        updates: data.updates,
      });
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  emitToRoom(roomId: string, event: string, data: any) {
    this.server.to(`room:${roomId}`).emit(event, data);
  }

  emitToUser(userId: string, event: string, data: any) {
    const socketId = this.userSocketMap.get(userId);
    if (socketId) {
      this.server.to(socketId).emit(event, data);
    }
  }

  isUserOnline(userId: string): boolean {
    return this.userSocketMap.has(userId);
  }
}
