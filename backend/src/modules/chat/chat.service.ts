import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SendMessageDto } from './dto/chat.dto';
import { ChatType } from '@prisma/client';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async getConversations(userId: string) {
    const [sent, received] = await Promise.all([
      this.prisma.chat.findMany({
        where: { senderId: userId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        include: {
          receiver: { select: { id: true, username: true, displayName: true, avatar: true, isOnline: true, lastSeen: true } },
        },
      }),
      this.prisma.chat.findMany({
        where: { receiverId: userId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        include: {
          sender: { select: { id: true, username: true, displayName: true, avatar: true, isOnline: true, lastSeen: true } },
        },
      }),
    ]);

    const convMap = new Map<string, any>();

    for (const msg of sent) {
      const otherId = msg.receiverId;
      const existing = convMap.get(otherId);
      if (!existing || existing.lastMessage.createdAt < msg.createdAt) {
        convMap.set(otherId, { user: msg.receiver, lastMessage: msg, unreadCount: 0 });
      }
    }

    for (const msg of received) {
      const otherId = msg.senderId;
      const existing = convMap.get(otherId);
      if (!existing || existing.lastMessage.createdAt < msg.createdAt) {
        convMap.set(otherId, { user: msg.sender, lastMessage: msg, unreadCount: 0 });
      }
    }

    const unreadCounts = await this.prisma.chat.groupBy({
      by: ['senderId'],
      where: { receiverId: userId, isRead: false, deletedAt: null },
      _count: { id: true },
    });

    for (const row of unreadCounts) {
      const conv = convMap.get(row.senderId);
      if (conv) conv.unreadCount = row._count.id;
    }

    return Array.from(convMap.values()).sort(
      (a, b) => b.lastMessage.createdAt.getTime() - a.lastMessage.createdAt.getTime(),
    );
  }

  async getMessages(userId: string, otherUserId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const where = {
      deletedAt: null,
      OR: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId },
      ],
    };

    const [messages, total] = await Promise.all([
      this.prisma.chat.findMany({ where, orderBy: { createdAt: 'asc' }, skip, take: limit }),
      this.prisma.chat.count({ where }),
    ]);

    await this.prisma.chat.updateMany({
      where: { senderId: otherUserId, receiverId: userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    return {
      items: messages.map((m) => ({ ...m, isMine: m.senderId === userId })),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async sendMessage(senderId: string, dto: SendMessageDto) {
    const receiver = await this.prisma.user.findUnique({ where: { id: dto.receiverId } });
    if (!receiver) throw new NotFoundException('User not found');

    const message = await this.prisma.chat.create({
      data: {
        senderId,
        receiverId: dto.receiverId,
        content: dto.content,
        type: dto.type ?? ChatType.TEXT,
      },
      include: {
        sender: { select: { id: true, username: true, displayName: true, avatar: true } },
      },
    });

    return { ...message, isMine: true };
  }

  async markAsRead(userId: string, otherUserId: string) {
    const result = await this.prisma.chat.updateMany({
      where: { senderId: otherUserId, receiverId: userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { updated: result.count };
  }

  async deleteMessage(userId: string, messageId: string) {
    const message = await this.prisma.chat.findUnique({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Message not found');
    if (message.senderId !== userId) throw new ForbiddenException('Cannot delete this message');

    await this.prisma.chat.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    });

    return { deleted: true };
  }
}
