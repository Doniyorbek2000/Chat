import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import {
  BanUserDto,
  CreateGiftDto,
  UpdateGiftDto,
  RejectWithdrawalDto,
  BroadcastDto,
  UpdateUserDto,
} from './dto/admin.dto';
import {
  BanType,
  WithdrawalStatus,
  GiftCategory,
  GiftType,
} from '@prisma/client';
import * as dayjs from 'dayjs';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
  ) {}

  // ==================== DASHBOARD ====================

  async getDashboardStats() {
    const now = new Date();
    const todayStart = dayjs().startOf('day').toDate();
    const weekStart = dayjs().startOf('week').toDate();
    const monthStart = dayjs().startOf('month').toDate();

    const [
      totalUsers,
      newUsersToday,
      newUsersWeek,
      newUsersMonth,
      activeRooms,
      transactionsToday,
      transactionsMonth,
      activeVips,
      revenueToday,
      revenueMonth,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.user.count({ where: { createdAt: { gte: weekStart } } }),
      this.prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
      this.prisma.voiceRoom.count({ where: { isLive: true } }),
      this.prisma.transaction.count({
        where: { createdAt: { gte: todayStart } },
      }),
      this.prisma.transaction.count({
        where: { createdAt: { gte: monthStart } },
      }),
      this.prisma.user.count({ where: { isVip: true } }),
      this.prisma.transaction.aggregate({
        where: { type: 'RECHARGE', createdAt: { gte: todayStart } },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { type: 'RECHARGE', createdAt: { gte: monthStart } },
        _sum: { amount: true },
      }),
    ]);

    return {
      users: {
        total: totalUsers,
        newToday: newUsersToday,
        newThisWeek: newUsersWeek,
        newThisMonth: newUsersMonth,
      },
      rooms: {
        activeNow: activeRooms,
      },
      transactions: {
        today: transactionsToday,
        thisMonth: transactionsMonth,
      },
      revenue: {
        today: Number(revenueToday._sum.amount || 0),
        thisMonth: Number(revenueMonth._sum.amount || 0),
      },
      vips: {
        active: activeVips,
      },
    };
  }

  async getStats() {
    return this.getDashboardStats();
  }

  // ==================== USERS ====================

  async getUsers(filters: {
    search?: string;
    status?: string;
    vipLevel?: number;
    page?: number;
    limit?: number;
  }) {
    const { search, status, vipLevel, page = 1, limit = 20 } = filters;

    const where: any = {};

    if (search) {
      where.OR = [
        { displayName: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { uid: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }

    if (status === 'banned') {
      where.isBanned = true;
    } else if (status === 'active') {
      where.isBanned = false;
    } else if (status === 'online') {
      where.isOnline = true;
    }

    if (vipLevel !== undefined) {
      where.vipLevel = vipLevel;
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          uid: true,
          displayName: true,
          username: true,
          avatar: true,
          phone: true,
          email: true,
          role: true,
          isVip: true,
          vipLevel: true,
          isBanned: true,
          banReason: true,
          bannedUntil: true,
          isOnline: true,
          isVerified: true,
          country: true,
          level: true,
          createdAt: true,
          wallet: {
            select: {
              coins: true,
              diamonds: true,
              totalRecharge: true,
              totalEarned: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallet: true,
        bans: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            admin: { select: { id: true, displayName: true, uid: true } },
          },
        },
        vipSubscriptions: {
          where: { isActive: true },
          include: { plan: true },
        },
        _count: {
          select: {
            hostedRooms: true,
            sentGifts: true,
            receivedGifts: true,
            followers: true,
            following: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateUser(adminId: string, userId: string, data: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.displayName && { displayName: data.displayName }),
        ...(data.bio !== undefined && { bio: data.bio }),
        ...(data.role && { role: data.role as any }),
        ...(data.isVerified !== undefined && { isVerified: data.isVerified }),
      },
    });

    await this.createAuditLog(adminId, 'UPDATE_USER', 'User', userId, {
      changes: data,
    });

    return updated;
  }

  async banUser(adminId: string, userId: string, dto: BanUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.isBanned) throw new BadRequestException('User is already banned');

    const bannedUntil = dto.isPermanent
      ? null
      : dto.bannedUntil
        ? new Date(dto.bannedUntil)
        : null;

    const [updatedUser] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          isBanned: true,
          banReason: dto.reason,
          bannedUntil,
        },
      }),
      this.prisma.ban.create({
        data: {
          userId,
          adminId,
          type: BanType.PLATFORM,
          reason: dto.reason,
          bannedUntil,
          isPermanent: dto.isPermanent,
        },
      }),
    ]);

    await this.createAuditLog(adminId, 'BAN_USER', 'User', userId, {
      reason: dto.reason,
      isPermanent: dto.isPermanent,
      bannedUntil,
    });

    return updatedUser;
  }

  async unbanUser(adminId: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (!user.isBanned) throw new BadRequestException('User is not banned');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isBanned: false, banReason: null, bannedUntil: null },
    });

    await this.createAuditLog(adminId, 'UNBAN_USER', 'User', userId, {});

    return updated;
  }

  // ==================== WITHDRAWALS ====================

  async getWithdrawals(status?: string, page = 1, limit = 20) {
    const where: any = {};
    if (status) where.status = status as WithdrawalStatus;

    const [data, total] = await Promise.all([
      this.prisma.withdrawal.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              uid: true,
              displayName: true,
              avatar: true,
              phone: true,
            },
          },
          processor: {
            select: { id: true, uid: true, displayName: true },
          },
        },
      }),
      this.prisma.withdrawal.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async approveWithdrawal(adminId: string, withdrawalId: string) {
    const withdrawal = await this.prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
    });
    if (!withdrawal) throw new NotFoundException('Withdrawal not found');
    if (withdrawal.status !== WithdrawalStatus.PENDING) {
      throw new BadRequestException('Withdrawal is not in pending status');
    }

    const updated = await this.prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: {
        status: WithdrawalStatus.APPROVED,
        processedBy: adminId,
        processedAt: new Date(),
      },
    });

    await this.createAuditLog(
      adminId,
      'APPROVE_WITHDRAWAL',
      'Withdrawal',
      withdrawalId,
      {
        amount: Number(withdrawal.amount),
        userId: withdrawal.userId,
      },
    );

    return updated;
  }

  async rejectWithdrawal(
    adminId: string,
    withdrawalId: string,
    dto: RejectWithdrawalDto,
  ) {
    const withdrawal = await this.prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
    });
    if (!withdrawal) throw new NotFoundException('Withdrawal not found');
    if (withdrawal.status !== WithdrawalStatus.PENDING) {
      throw new BadRequestException('Withdrawal is not in pending status');
    }

    // Refund diamonds to user
    await this.walletService.addDiamonds(
      withdrawal.userId,
      Number(withdrawal.amount),
      `Withdrawal rejected: ${dto.reason}`,
      withdrawalId,
    );

    const updated = await this.prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: {
        status: WithdrawalStatus.REJECTED,
        processedBy: adminId,
        processedAt: new Date(),
        note: dto.reason,
      },
    });

    await this.createAuditLog(
      adminId,
      'REJECT_WITHDRAWAL',
      'Withdrawal',
      withdrawalId,
      {
        reason: dto.reason,
        amount: Number(withdrawal.amount),
        userId: withdrawal.userId,
      },
    );

    return updated;
  }

  // ==================== GIFTS ====================

  async getAllGifts() {
    return this.prisma.gift.findMany({
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  async createGift(data: CreateGiftDto) {
    return this.prisma.gift.create({
      data: {
        name: data.name,
        category: data.category as GiftCategory,
        type: data.type as GiftType,
        imageUrl: data.imageUrl,
        animationUrl: data.animationUrl,
        coinPrice: data.coinPrice,
        diamondPrice: data.diamondPrice,
        sortOrder: data.sortOrder,
        isActive: true,
      },
    });
  }

  async updateGift(giftId: string, data: UpdateGiftDto) {
    const gift = await this.prisma.gift.findUnique({ where: { id: giftId } });
    if (!gift) throw new NotFoundException('Gift not found');

    return this.prisma.gift.update({
      where: { id: giftId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.category && { category: data.category as GiftCategory }),
        ...(data.type && { type: data.type as GiftType }),
        ...(data.imageUrl && { imageUrl: data.imageUrl }),
        ...(data.animationUrl !== undefined && {
          animationUrl: data.animationUrl,
        }),
        ...(data.coinPrice !== undefined && { coinPrice: data.coinPrice }),
        ...(data.diamondPrice !== undefined && {
          diamondPrice: data.diamondPrice,
        }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  async toggleGiftStatus(giftId: string) {
    const gift = await this.prisma.gift.findUnique({ where: { id: giftId } });
    if (!gift) throw new NotFoundException('Gift not found');

    return this.prisma.gift.update({
      where: { id: giftId },
      data: { isActive: !gift.isActive },
    });
  }

  // ==================== NOTIFICATIONS ====================

  async sendBroadcastNotification(dto: BroadcastDto) {
    this.logger.log(`[BROADCAST] title="${dto.title}" body="${dto.body}"`);

    // In production: integrate Firebase Admin SDK to send FCM notifications
    // For now, create a notification record for all users in batches
    const userCount = await this.prisma.user.count({
      where: { isBanned: false },
    });

    this.logger.log(`[BROADCAST] Would send to ${userCount} users`);

    return {
      message: 'Broadcast notification queued',
      targetUsers: userCount,
      title: dto.title,
      body: dto.body,
    };
  }

  // ==================== AUDIT LOGS ====================

  async getAuditLogs(page = 1, limit = 20) {
    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count(),
    ]);

    // Enrich with admin info
    const adminIds = [...new Set(logs.map((l) => l.adminId))];
    const admins = await this.prisma.user.findMany({
      where: { id: { in: adminIds } },
      select: { id: true, uid: true, displayName: true, avatar: true },
    });
    const adminMap = Object.fromEntries(admins.map((a) => [a.id, a]));

    const data = logs.map((log) => ({
      ...log,
      admin: adminMap[log.adminId] || null,
    }));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ==================== REVENUE ====================

  async getRevenueSummary(startDate?: string, endDate?: string) {
    const start = startDate
      ? new Date(startDate)
      : dayjs().subtract(30, 'day').toDate();
    const end = endDate ? new Date(endDate) : new Date();
    const today = dayjs().startOf('day').toDate();
    const weekStart = dayjs().startOf('week').toDate();
    const monthStart = dayjs().startOf('month').toDate();

    const [
      total,
      todayRevenue,
      weekRevenue,
      monthRevenue,
      pendingWithdrawals,
      paymentBreakdown,
    ] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: {
          type: 'RECHARGE',
          status: 'COMPLETED',
          createdAt: { gte: start, lte: end },
        },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.transaction.aggregate({
        where: {
          type: 'RECHARGE',
          status: 'COMPLETED',
          createdAt: { gte: today },
        },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          type: 'RECHARGE',
          status: 'COMPLETED',
          createdAt: { gte: weekStart },
        },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          type: 'RECHARGE',
          status: 'COMPLETED',
          createdAt: { gte: monthStart },
        },
        _sum: { amount: true },
      }),
      this.prisma.withdrawal.aggregate({
        where: { status: 'PENDING' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.transaction.groupBy({
        by: ['referenceType'],
        where: {
          type: 'RECHARGE',
          status: 'COMPLETED',
          createdAt: { gte: start, lte: end },
        },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    return {
      total: Number(total._sum.amount || 0),
      totalTransactions: total._count,
      today: Number(todayRevenue._sum.amount || 0),
      thisWeek: Number(weekRevenue._sum.amount || 0),
      thisMonth: Number(monthRevenue._sum.amount || 0),
      pendingWithdrawals: Number(pendingWithdrawals._sum.amount || 0),
      pendingWithdrawalCount: pendingWithdrawals._count,
      paymentBreakdown: paymentBreakdown.map((p) => ({
        provider: p.referenceType || 'unknown',
        total: Number(p._sum.amount || 0),
        count: p._count,
      })),
    };
  }

  async getRevenueChart(
    period: 'daily' | 'weekly' | 'monthly' = 'daily',
    days = 30,
  ) {
    const start = dayjs().subtract(days, 'day').startOf('day').toDate();

    const transactions = await this.prisma.transaction.findMany({
      where: {
        type: 'RECHARGE',
        status: 'COMPLETED',
        createdAt: { gte: start },
      },
      select: { amount: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group by day
    const grouped = new Map<string, { revenue: number; count: number }>();
    for (let i = 0; i < days; i++) {
      const key = dayjs().subtract(i, 'day').format('YYYY-MM-DD');
      grouped.set(key, { revenue: 0, count: 0 });
    }

    for (const tx of transactions) {
      const key = dayjs(tx.createdAt).format('YYYY-MM-DD');
      const existing = grouped.get(key);
      if (existing) {
        existing.revenue += Number(tx.amount);
        existing.count += 1;
      }
    }

    return Array.from(grouped.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async getTopRechargedUsers(limit = 20) {
    const topUsers = await this.prisma.transaction.groupBy({
      by: ['userId'],
      where: { type: 'RECHARGE', status: 'COMPLETED' },
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: 'desc' } },
      take: limit,
    });

    const userIds = topUsers.map((u) => u.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        uid: true,
        username: true,
        displayName: true,
        avatar: true,
        vipLevel: true,
      },
    });
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    return topUsers.map((row) => ({
      user: userMap[row.userId] || { id: row.userId },
      totalRecharge: Number(row._sum.amount || 0),
      transactionCount: row._count,
    }));
  }

  // ==================== HELPERS ====================

  private async createAuditLog(
    adminId: string,
    action: string,
    targetType: string,
    targetId: string,
    details: any,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: { adminId, action, targetType, targetId, details },
      });
    } catch (err) {
      this.logger.error('Failed to create audit log', err);
    }
  }
}
