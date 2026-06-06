import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BadgeType, VerificationStatus } from '@prisma/client';

@Injectable()
export class VerificationService {
  constructor(private prisma: PrismaService) {}

  async getBadges() {
    return this.prisma.verificationBadge.findMany({ orderBy: { createdAt: 'asc' } });
  }

  async getUserBadges(userId: string) {
    return this.prisma.userVerificationBadge.findMany({
      where: { userId, status: VerificationStatus.APPROVED },
      include: { badge: true },
    });
  }

  async getUserVerification(userId: string) {
    return this.prisma.userVerificationBadge.findMany({
      where: { userId },
      include: { badge: true },
    });
  }

  async verifyUser(userId: string, badgeType: BadgeType, adminId: string) {
    const badge = await this.prisma.verificationBadge.findUnique({ where: { type: badgeType } });
    if (!badge) throw new NotFoundException('Badge topilmadi');

    const result = await this.prisma.userVerificationBadge.upsert({
      where: { userId_badgeId: { userId, badgeId: badge.id } },
      update: { status: VerificationStatus.APPROVED, grantedBy: adminId, grantedAt: new Date() },
      create: {
        userId,
        badgeId: badge.id,
        status: VerificationStatus.APPROVED,
        grantedBy: adminId,
        grantedAt: new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        adminId,
        action: 'USER_VERIFIED',
        targetId: userId,
        targetType: 'User',
        details: { badgeType },
      },
    });

    return result;
  }

  async unverifyUser(userId: string, badgeType: BadgeType, adminId: string) {
    const badge = await this.prisma.verificationBadge.findUnique({ where: { type: badgeType } });
    if (!badge) throw new NotFoundException('Badge topilmadi');

    await this.prisma.userVerificationBadge.updateMany({
      where: { userId, badgeId: badge.id },
      data: { status: VerificationStatus.REJECTED },
    });

    await this.prisma.auditLog.create({
      data: {
        adminId,
        action: 'USER_UNVERIFIED',
        targetId: userId,
        targetType: 'User',
        details: { badgeType },
      },
    });

    return { success: true };
  }

  async verifyAgency(agencyId: string, adminId: string) {
    const badge = await this.prisma.verificationBadge.findUnique({
      where: { type: BadgeType.VERIFIED_AGENCY },
    });
    if (!badge) throw new NotFoundException();

    const result = await this.prisma.agencyVerificationBadge.upsert({
      where: { agencyId_badgeId: { agencyId, badgeId: badge.id } },
      update: { status: VerificationStatus.APPROVED, grantedBy: adminId, grantedAt: new Date() },
      create: {
        agencyId,
        badgeId: badge.id,
        status: VerificationStatus.APPROVED,
        grantedBy: adminId,
        grantedAt: new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        adminId,
        action: 'AGENCY_VERIFIED',
        targetId: agencyId,
        targetType: 'Agency',
      },
    });

    return result;
  }

  async listPendingRequests(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.userVerificationBadge.findMany({
        where: { status: VerificationStatus.PENDING },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, displayName: true, avatar: true, uid: true } },
          badge: true,
        },
      }),
      this.prisma.userVerificationBadge.count({ where: { status: VerificationStatus.PENDING } }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async autoGrantPhoneVerified(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.phone) return;
    const badge = await this.prisma.verificationBadge.findUnique({ where: { type: BadgeType.PHONE_VERIFIED } });
    if (!badge) return;
    await this.prisma.userVerificationBadge.upsert({
      where: { userId_badgeId: { userId, badgeId: badge.id } },
      update: { status: VerificationStatus.APPROVED, grantedAt: new Date() },
      create: { userId, badgeId: badge.id, status: VerificationStatus.APPROVED, grantedAt: new Date() },
    });
  }

  async autoGrantEmailVerified(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.email) return;
    const badge = await this.prisma.verificationBadge.findUnique({ where: { type: BadgeType.EMAIL_VERIFIED } });
    if (!badge) return;
    await this.prisma.userVerificationBadge.upsert({
      where: { userId_badgeId: { userId, badgeId: badge.id } },
      update: { status: VerificationStatus.APPROVED, grantedAt: new Date() },
      create: { userId, badgeId: badge.id, status: VerificationStatus.APPROVED, grantedAt: new Date() },
    });
  }

  async seedBadges() {
    const badges = [
      { type: BadgeType.PHONE_VERIFIED, name: 'Telefon tasdiqlangan', description: 'Telefon raqami tasdiqlangan' },
      { type: BadgeType.EMAIL_VERIFIED, name: 'Email tasdiqlangan', description: 'Email manzil tasdiqlangan' },
      { type: BadgeType.VERIFIED_HOST, name: 'Tasdiqlangan Host', description: 'Rasmiy tasdiqlangan host' },
      { type: BadgeType.VERIFIED_AGENCY, name: 'Tasdiqlangan Agency', description: 'Rasmiy tasdiqlangan agency' },
      { type: BadgeType.OFFICIAL, name: 'Rasmiy hisob', description: 'VOXO rasmiy hisobi' },
      { type: BadgeType.SAFE_ROOM, name: 'Xavfsiz room', description: 'Xavfsiz va moderatsiya qilingan room' },
      { type: BadgeType.TOP_CREATOR, name: 'Top Creator', description: 'Top content creator' },
    ];

    for (const b of badges) {
      await this.prisma.verificationBadge.upsert({
        where: { type: b.type },
        update: { name: b.name, description: b.description },
        create: b,
      });
    }
  }
}
