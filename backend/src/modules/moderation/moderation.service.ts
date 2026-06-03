import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { PrismaService } from '../../prisma/prisma.service';
import { ReportUserDto, BanUserDto, MuteUserDto, ResolveReportDto, GetReportsDto } from './dto/moderation.dto';
import { ReportStatus, BanType } from '@prisma/client';

@Injectable()
export class ModerationService {
  constructor(
    private prisma: PrismaService,
    @InjectRedis() private redis: Redis,
  ) {}

  async reportUser(reporterId: string, dto: ReportUserDto) {
    return this.prisma.report.create({
      data: {
        reporterId,
        targetId: dto.targetId,
        targetType: dto.targetType,
        reason: dto.reason,
        description: dto.description,
        status: ReportStatus.PENDING,
      },
    });
  }

  async getReports(dto: GetReportsDto) {
    const { page = 1, limit = 20, status } = dto;
    const skip = (page - 1) * limit;
    const where = status ? { status } : {};

    const [items, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          reporter: { select: { id: true, username: true, displayName: true, avatar: true } },
        },
      }),
      this.prisma.report.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async resolveReport(adminId: string, reportId: string, dto: ResolveReportDto) {
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException('Report not found');

    return this.prisma.report.update({
      where: { id: reportId },
      data: {
        status: dto.action as ReportStatus,
        resolvedBy: adminId,
        resolvedAt: new Date(),
        evidence: dto.notes ? { notes: dto.notes } : undefined,
      },
    });
  }

  async banUser(adminId: string, dto: BanUserDto) {
    const bannedUntil = dto.durationHours && !dto.isPermanent
      ? new Date(Date.now() + dto.durationHours * 3600 * 1000)
      : null;

    const [ban] = await this.prisma.$transaction([
      this.prisma.ban.create({
        data: {
          userId: dto.userId,
          adminId,
          type: dto.type,
          reason: dto.reason,
          bannedUntil,
          isPermanent: dto.isPermanent ?? false,
          roomId: dto.roomId,
        },
      }),
      ...(dto.type === BanType.PLATFORM || dto.isPermanent
        ? [this.prisma.user.update({ where: { id: dto.userId }, data: { isBanned: true } })]
        : []),
    ]);

    return ban;
  }

  async unbanUser(adminId: string, userId: string) {
    await this.prisma.$transaction([
      this.prisma.ban.deleteMany({ where: { userId } }),
      this.prisma.user.update({ where: { id: userId }, data: { isBanned: false } }),
    ]);
    return { unbanned: true };
  }

  async muteUser(adminId: string, dto: MuteUserDto) {
    const key = dto.roomId
      ? `mute:${dto.userId}:${dto.roomId}`
      : `mute:${dto.userId}`;
    await this.redis.set(key, adminId, 'EX', dto.durationSeconds);
    return { muted: true, key, duration: dto.durationSeconds };
  }

  async unmuteUser(adminId: string, userId: string, roomId?: string) {
    const key = roomId ? `mute:${userId}:${roomId}` : `mute:${userId}`;
    await this.redis.del(key);
    return { unmuted: true };
  }

  async checkMute(userId: string, roomId?: string): Promise<boolean> {
    const keys = roomId
      ? [`mute:${userId}:${roomId}`, `mute:${userId}`]
      : [`mute:${userId}`];
    for (const key of keys) {
      if (await this.redis.exists(key)) return true;
    }
    return false;
  }

  async getUserReports(targetId: string) {
    return this.prisma.report.findMany({
      where: { targetId },
      orderBy: { createdAt: 'desc' },
      include: {
        reporter: { select: { id: true, username: true, displayName: true, avatar: true } },
      },
    });
  }
}
