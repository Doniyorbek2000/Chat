import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EarningType, PayoutStatus } from '@prisma/client';

@Injectable()
export class AgencySalaryService {
  constructor(private prisma: PrismaService) {}

  private currentPeriodKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  async recordGiftEarning(hostUserId: string, giftValue: bigint, giftTxId: string) {
    const agencyHost = await this.prisma.agencyHost.findUnique({
      where: { userId: hostUserId },
    });
    if (!agencyHost) return null;

    const commission = BigInt(Math.floor(Number(giftValue) * agencyHost.commissionRate));
    const netAmount = giftValue - commission;
    const periodKey = this.currentPeriodKey();

    return this.prisma.hostEarning.create({
      data: {
        agencyHostId: agencyHost.id,
        userId: hostUserId,
        type: EarningType.GIFT_INCOME,
        giftTxId,
        grossAmount: giftValue,
        commission,
        netAmount,
        periodKey,
      },
    });
  }

  async getMyEarnings(userId: string, periodKey?: string) {
    const agencyHost = await this.prisma.agencyHost.findUnique({ where: { userId } });
    if (!agencyHost) return [];

    const where: any = { agencyHostId: agencyHost.id };
    if (periodKey) where.periodKey = periodKey;

    const earnings = await this.prisma.hostEarning.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const summary = earnings.reduce(
      (acc, e) => ({
        grossAmount: acc.grossAmount + e.grossAmount,
        commission: acc.commission + e.commission,
        netAmount: acc.netAmount + e.netAmount,
      }),
      { grossAmount: BigInt(0), commission: BigInt(0), netAmount: BigInt(0) },
    );

    return {
      earnings: earnings.map((e) => ({
        ...e,
        grossAmount: e.grossAmount.toString(),
        commission: e.commission.toString(),
        netAmount: e.netAmount.toString(),
      })),
      summary: {
        grossAmount: summary.grossAmount.toString(),
        commission: summary.commission.toString(),
        netAmount: summary.netAmount.toString(),
      },
    };
  }

  async getMyPayouts(userId: string) {
    const agencyHost = await this.prisma.agencyHost.findUnique({ where: { userId } });
    if (!agencyHost) return [];

    const payouts = await this.prisma.hostPayout.findMany({
      where: { agencyHostId: agencyHost.id },
      orderBy: { createdAt: 'desc' },
    });

    return payouts.map((p) => ({ ...p, amount: p.amount.toString() }));
  }

  async requestPayout(userId: string, periodKey: string) {
    const agencyHost = await this.prisma.agencyHost.findUnique({ where: { userId } });
    if (!agencyHost) throw new NotFoundException('Agency host profili topilmadi');

    // Check risk
    const risk = await this.prisma.riskScore.findUnique({ where: { userId } });
    if (risk && (risk.level === 'HIGH' || risk.level === 'CRITICAL')) {
      throw new ForbiddenException('Risk darajasi yuqori, to\'lov bloklanган');
    }

    // Check existing pending payout
    const existing = await this.prisma.hostPayout.findFirst({
      where: { agencyHostId: agencyHost.id, periodKey, status: PayoutStatus.PENDING },
    });
    if (existing) throw new ConflictException('Bu davr uchun so\'rov allaqachon mavjud');

    // Calculate amount
    const earnings = await this.prisma.hostEarning.aggregate({
      where: { agencyHostId: agencyHost.id, periodKey },
      _sum: { netAmount: true },
    });

    const amount = earnings._sum.netAmount ?? BigInt(0);
    if (amount <= BigInt(0)) throw new ForbiddenException('Hisoblanган daromad yo\'q');

    return this.prisma.hostPayout.create({
      data: {
        agencyHostId: agencyHost.id,
        userId,
        amount,
        periodKey,
        status: PayoutStatus.PENDING,
      },
    });
  }

  async getAgencyHosts(ownerId: string) {
    const agency = await this.prisma.agency.findUnique({ where: { ownerId } });
    if (!agency) throw new NotFoundException();

    const hosts = await this.prisma.agencyHost.findMany({
      where: { agencyId: agency.id },
      include: {
        user: { select: { id: true, displayName: true, avatar: true, uid: true } },
        earnings: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    return hosts.map((h) => ({
      ...h,
      commissionRate: h.commissionRate,
      totalEarnings: h.earnings
        .reduce((sum, e) => sum + e.netAmount, BigInt(0))
        .toString(),
    }));
  }

  async inviteHost(ownerId: string, targetUserId: string) {
    const agency = await this.prisma.agency.findUnique({ where: { ownerId } });
    if (!agency) throw new NotFoundException();

    const existing = await this.prisma.agencyHost.findUnique({
      where: { userId: targetUserId },
    });
    if (existing) throw new ConflictException('Bu foydalanuvchi allaqachon biror agencyda');

    return this.prisma.agencyHost.create({
      data: {
        agencyId: agency.id,
        userId: targetUserId,
        commissionRate: agency.commission / 100,
      },
    });
  }

  // Admin
  async adminListPendingPayouts(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.hostPayout.findMany({
        where: { status: PayoutStatus.PENDING },
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
        include: {
          user: { select: { id: true, displayName: true, uid: true } },
          agencyHost: { include: { agency: { select: { name: true } } } },
        },
      }),
      this.prisma.hostPayout.count({ where: { status: PayoutStatus.PENDING } }),
    ]);

    return {
      data: data.map((p) => ({ ...p, amount: p.amount.toString() })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async adminListAllPayouts(status?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status as PayoutStatus;

    const [data, total] = await Promise.all([
      this.prisma.hostPayout.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, displayName: true, uid: true } },
          agencyHost: { include: { agency: { select: { name: true } } } },
        },
      }),
      this.prisma.hostPayout.count({ where }),
    ]);

    return {
      data: data.map((p) => ({ ...p, amount: p.amount.toString() })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async adminApprovePayout(payoutId: string, adminId: string) {
    const payout = await this.prisma.hostPayout.findUnique({ where: { id: payoutId } });
    if (!payout) throw new NotFoundException();

    await this.prisma.$transaction([
      this.prisma.hostPayout.update({
        where: { id: payoutId },
        data: { status: PayoutStatus.COMPLETED, approvedBy: adminId, approvedAt: new Date() },
      }),
      this.prisma.auditLog.create({
        data: {
          adminId,
          action: 'HOST_PAYOUT_APPROVED',
          targetId: payoutId,
          targetType: 'HostPayout',
          details: { amount: payout.amount.toString(), userId: payout.userId },
        },
      }),
    ]);

    return { success: true };
  }

  async adminRejectPayout(payoutId: string, adminId: string, reason: string) {
    const payout = await this.prisma.hostPayout.findUnique({ where: { id: payoutId } });
    if (!payout) throw new NotFoundException();

    await this.prisma.$transaction([
      this.prisma.hostPayout.update({
        where: { id: payoutId },
        data: { status: PayoutStatus.REJECTED, note: reason },
      }),
      this.prisma.auditLog.create({
        data: {
          adminId,
          action: 'HOST_PAYOUT_REJECTED',
          targetId: payoutId,
          targetType: 'HostPayout',
          details: { reason, userId: payout.userId },
        },
      }),
    ]);

    return { success: true };
  }
}
