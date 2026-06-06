import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RoomModerationService {
  constructor(private prisma: PrismaService) {}

  async isModeratorOrHost(roomId: string, userId: string): Promise<boolean> {
    const room = await this.prisma.voiceRoom.findUnique({ where: { id: roomId } });
    if (!room) return false;
    if (room.hostId === userId) return true;

    const mod = await this.prisma.roomModerator.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    return !!mod;
  }

  private async requireModOrHost(roomId: string, actorId: string) {
    const ok = await this.isModeratorOrHost(roomId, actorId);
    if (!ok) throw new ForbiddenException('Sizda ushbu amalni bajarish huquqi yo\'q');
  }

  private async requireHost(roomId: string, actorId: string) {
    const room = await this.prisma.voiceRoom.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException();
    if (room.hostId !== actorId) throw new ForbiddenException('Faqat room egasi ushbu amalni bajarishi mumkin');
  }

  private async logAction(roomId: string, actorId: string, action: string, targetId?: string, reason?: string, metadata?: any) {
    await this.prisma.roomModerationLog.create({
      data: { roomId, actorId, action, targetId, reason, metadata },
    });
  }

  async getModerators(roomId: string) {
    return this.prisma.roomModerator.findMany({
      where: { roomId },
      include: { user: { select: { id: true, displayName: true, avatar: true, uid: true } } },
    });
  }

  async addModerator(roomId: string, userId: string, addedBy: string) {
    await this.requireHost(roomId, addedBy);
    const mod = await this.prisma.roomModerator.create({
      data: { roomId, userId, addedBy },
    });
    await this.logAction(roomId, addedBy, 'ADD_MODERATOR', userId);
    return mod;
  }

  async removeModerator(roomId: string, userId: string, actorId: string) {
    await this.requireHost(roomId, actorId);
    await this.prisma.roomModerator.delete({ where: { roomId_userId: { roomId, userId } } });
    await this.logAction(roomId, actorId, 'REMOVE_MODERATOR', userId);
    return { success: true };
  }

  async muteUser(roomId: string, userId: string, mutedBy: string, durationMinutes?: number) {
    await this.requireModOrHost(roomId, mutedBy);
    const expiresAt = durationMinutes ? new Date(Date.now() + durationMinutes * 60000) : undefined;

    await this.prisma.roomMute.upsert({
      where: { roomId_userId: { roomId, userId } },
      update: { mutedBy, expiresAt: expiresAt ?? null },
      create: { roomId, userId, mutedBy, expiresAt },
    });

    await this.logAction(roomId, mutedBy, 'MUTE', userId, undefined, { durationMinutes });
    return { success: true };
  }

  async unmuteUser(roomId: string, userId: string, actorId: string) {
    await this.requireModOrHost(roomId, actorId);
    await this.prisma.roomMute.delete({ where: { roomId_userId: { roomId, userId } } }).catch(() => null);
    await this.logAction(roomId, actorId, 'UNMUTE', userId);
    return { success: true };
  }

  async kickUser(roomId: string, userId: string, actorId: string) {
    await this.requireModOrHost(roomId, actorId);
    // Remove from room members
    await this.prisma.roomMember.deleteMany({ where: { roomId, userId } });
    await this.logAction(roomId, actorId, 'KICK', userId);
    return { success: true, action: 'kicked' };
  }

  async banFromRoom(roomId: string, userId: string, bannedBy: string, reason?: string) {
    await this.requireModOrHost(roomId, bannedBy);
    await this.prisma.roomBan.upsert({
      where: { roomId_userId: { roomId, userId } },
      update: { bannedBy, reason: reason ?? null },
      create: { roomId, userId, bannedBy, reason },
    });
    await this.logAction(roomId, bannedBy, 'BAN', userId, reason);
    return { success: true };
  }

  async unbanFromRoom(roomId: string, userId: string, actorId: string) {
    await this.requireModOrHost(roomId, actorId);
    await this.prisma.roomBan.delete({ where: { roomId_userId: { roomId, userId } } }).catch(() => null);
    await this.logAction(roomId, actorId, 'UNBAN', userId);
    return { success: true };
  }

  async isUserMuted(roomId: string, userId: string): Promise<boolean> {
    const mute = await this.prisma.roomMute.findUnique({ where: { roomId_userId: { roomId, userId } } });
    if (!mute) return false;
    if (mute.expiresAt && mute.expiresAt < new Date()) {
      await this.prisma.roomMute.delete({ where: { roomId_userId: { roomId, userId } } });
      return false;
    }
    return true;
  }

  async isUserBanned(roomId: string, userId: string): Promise<boolean> {
    const ban = await this.prisma.roomBan.findUnique({ where: { roomId_userId: { roomId, userId } } });
    if (!ban) return false;
    if (ban.expiresAt && ban.expiresAt < new Date()) {
      await this.prisma.roomBan.delete({ where: { roomId_userId: { roomId, userId } } });
      return false;
    }
    return true;
  }

  async addKeyword(roomId: string, keyword: string, addedBy: string) {
    await this.requireModOrHost(roomId, addedBy);
    return this.prisma.roomKeywordFilter.upsert({
      where: { roomId_keyword: { roomId, keyword: keyword.toLowerCase() } },
      update: {},
      create: { roomId, keyword: keyword.toLowerCase(), addedBy },
    });
  }

  async removeKeyword(roomId: string, keyword: string) {
    return this.prisma.roomKeywordFilter
      .delete({ where: { roomId_keyword: { roomId, keyword: keyword.toLowerCase() } } })
      .catch(() => ({ success: true }));
  }

  async getKeywords(roomId: string) {
    return this.prisma.roomKeywordFilter.findMany({ where: { roomId }, orderBy: { createdAt: 'desc' } });
  }

  async setSlowMode(roomId: string, isEnabled: boolean, intervalSec: number, actorId: string) {
    await this.requireHost(roomId, actorId);
    const setting = await this.prisma.roomSlowModeSetting.upsert({
      where: { roomId },
      update: { isEnabled, intervalSec },
      create: { roomId, isEnabled, intervalSec },
    });
    await this.logAction(roomId, actorId, 'SET_SLOW_MODE', undefined, undefined, { isEnabled, intervalSec });
    return setting;
  }

  async setGiftOnly(roomId: string, giftOnly: boolean, actorId: string) {
    await this.requireHost(roomId, actorId);
    const setting = await this.prisma.roomSlowModeSetting.upsert({
      where: { roomId },
      update: { giftOnly },
      create: { roomId, giftOnly },
    });
    await this.logAction(roomId, actorId, 'SET_GIFT_ONLY', undefined, undefined, { giftOnly });
    return setting;
  }

  async getModerationLogs(roomId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.roomModerationLog.findMany({
        where: { roomId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { actor: { select: { id: true, displayName: true } } },
      }),
      this.prisma.roomModerationLog.count({ where: { roomId } }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getRoomBans(roomId: string) {
    return this.prisma.roomBan.findMany({
      where: { roomId },
      include: { user: { select: { id: true, displayName: true, avatar: true } } },
    });
  }
}
