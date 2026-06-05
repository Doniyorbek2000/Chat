import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(userId: string) {
    let settings = await this.prisma.userSettings.findUnique({ where: { userId } });
    if (!settings) {
      settings = await this.prisma.userSettings.create({ data: { userId } });
    }
    return settings;
  }

  async updateSettings(userId: string, dto: any) {
    const allowed = [
      'language', 'notifyGifts', 'notifyFollowers', 'notifyMessages', 'notifySystem',
      'profileVisible', 'showOnline', 'showLocation', 'allowFollow', 'allowMessages',
      'noiseCancellation', 'audioQuality',
    ];
    const data: any = {};
    for (const key of allowed) {
      if (dto[key] !== undefined) data[key] = dto[key];
    }
    return this.prisma.userSettings.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
  }

  async getLinkedAccounts(userId: string) {
    return this.prisma.userLinkedAccount.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
  }

  async getBlockedUsers(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.blockedUser.findMany({
        where: { blockerId: userId },
        include: { blocked: { select: { id: true, displayName: true, avatar: true, uid: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.blockedUser.count({ where: { blockerId: userId } }),
    ]);
    return { items, total, page, limit };
  }

  async blockUser(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) throw new BadRequestException('Cannot block yourself');
    const exists = await this.prisma.blockedUser.findUnique({ where: { blockerId_blockedId: { blockerId, blockedId } } });
    if (exists) return exists;
    return this.prisma.blockedUser.create({ data: { blockerId, blockedId } });
  }

  async unblockUser(blockerId: string, blockedId: string) {
    await this.prisma.blockedUser.delete({ where: { blockerId_blockedId: { blockerId, blockedId } } }).catch(() => {});
    return { success: true };
  }

  async requestAccountDeletion(userId: string, reason?: string) {
    const existing = await this.prisma.accountDeletionRequest.findUnique({ where: { userId } });
    if (existing && existing.status === 'SCHEDULED') {
      throw new BadRequestException('Deletion already scheduled');
    }
    const scheduledAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    return this.prisma.accountDeletionRequest.upsert({
      where: { userId },
      update: { status: 'SCHEDULED', reason, scheduledAt, cancelledAt: null, completedAt: null },
      create: { userId, reason, scheduledAt },
    });
  }

  async cancelAccountDeletion(userId: string) {
    const req = await this.prisma.accountDeletionRequest.findUnique({ where: { userId } });
    if (!req || req.status !== 'SCHEDULED') throw new NotFoundException('No scheduled deletion found');
    return this.prisma.accountDeletionRequest.update({
      where: { userId },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });
  }

  async getDeletionRequest(userId: string) {
    return this.prisma.accountDeletionRequest.findUnique({ where: { userId } });
  }

  async uploadLog(userId: string, dto: { fileName: string; appVersion?: string; deviceInfo?: string; platform?: string; logContent: string }) {
    const masked = this.maskPii(dto.logContent);
    return this.prisma.uploadedLog.create({
      data: {
        userId,
        fileName: dto.fileName,
        appVersion: dto.appVersion,
        deviceInfo: dto.deviceInfo,
        platform: dto.platform,
        logContent: masked,
      },
    });
  }

  private maskPii(log: string): string {
    return log
      .replace(/(\+?\d{7,15})/g, '[PHONE]')
      .replace(/[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}/g, '[EMAIL]')
      .replace(/Bearer\s+[\w\-._~+/]+=*/gi, 'Bearer [TOKEN]')
      .replace(/Authorization:\s*.+/gi, 'Authorization: [REDACTED]')
      .replace(/"token"\s*:\s*"[^"]+"/g, '"token":"[REDACTED]"')
      .replace(/"accessToken"\s*:\s*"[^"]+"/g, '"accessToken":"[REDACTED]"')
      .replace(/"refreshToken"\s*:\s*"[^"]+"/g, '"refreshToken":"[REDACTED]"');
  }
}
