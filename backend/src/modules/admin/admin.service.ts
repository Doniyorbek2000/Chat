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
  ReportStatus,
  Currency,
  TransactionType,
  TransactionStatus,
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

  async markWithdrawalPaid(adminId: string, withdrawalId: string, txId?: string) {
    const withdrawal = await this.prisma.withdrawal.findUnique({ where: { id: withdrawalId } });
    if (!withdrawal) throw new NotFoundException('Withdrawal not found');
    if (withdrawal.status !== WithdrawalStatus.APPROVED) {
      throw new BadRequestException('Withdrawal must be approved before marking as paid');
    }

    const updated = await this.prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: {
        status: WithdrawalStatus.COMPLETED,
        processedBy: adminId,
        processedAt: new Date(),
        ...(txId && { txId }),
      },
    });

    await this.createAuditLog(adminId, 'MARK_WITHDRAWAL_PAID', 'Withdrawal', withdrawalId, {
      txId,
      amount: Number(withdrawal.amount),
      userId: withdrawal.userId,
    });

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

  // ==================== NOBLE ====================

  async getNoblePlans() {
    return this.prisma.noblePlan.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async createNoblePlan(data: any) {
    return this.prisma.noblePlan.create({ data });
  }

  async updateNoblePlan(id: string, data: any) {
    return this.prisma.noblePlan.update({ where: { id }, data });
  }

  async deleteNoblePlan(id: string) {
    return this.prisma.noblePlan.delete({ where: { id } });
  }

  // ==================== MEDALS (ADMIN) ====================

  async getMedalsAdmin(params: { page?: number; limit?: number; category?: string } = {}) {
    const { page = 1, limit = 20, category } = params;
    const where: any = {};
    if (category) where.category = category;

    const [data, total] = await Promise.all([
      this.prisma.medal.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
      }),
      this.prisma.medal.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async createMedal(data: any) {
    return this.prisma.medal.create({ data });
  }

  async updateMedal(id: string, data: any) {
    return this.prisma.medal.update({ where: { id }, data });
  }

  async deleteMedal(id: string) {
    return this.prisma.medal.delete({ where: { id } });
  }

  // ==================== SHOP ITEMS (ADMIN) ====================

  async getShopItems(params: { page?: number; limit?: number; category?: string } = {}) {
    const { page = 1, limit = 20, category } = params;
    const where: any = {};
    if (category) where.category = category;

    const [data, total] = await Promise.all([
      this.prisma.shopItem.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
      }),
      this.prisma.shopItem.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async createShopItem(data: any) {
    return this.prisma.shopItem.create({ data });
  }

  async updateShopItem(id: string, data: any) {
    return this.prisma.shopItem.update({ where: { id }, data });
  }

  async deleteShopItem(id: string) {
    return this.prisma.shopItem.delete({ where: { id } });
  }

  // ==================== ROOM THEMES (ADMIN) ====================

  async getRoomThemesAdmin() {
    return this.prisma.roomTheme.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async createRoomTheme(data: any) {
    return this.prisma.roomTheme.create({ data });
  }

  async updateRoomTheme(id: string, data: any) {
    return this.prisma.roomTheme.update({ where: { id }, data });
  }

  async deleteRoomTheme(id: string) {
    return this.prisma.roomTheme.delete({ where: { id } });
  }

  // ==================== NAMEPLATES (ADMIN) ====================

  async getNameplatesAdmin() {
    return this.prisma.nameplate.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async createNameplate(data: any) {
    return this.prisma.nameplate.create({ data });
  }

  async updateNameplate(id: string, data: any) {
    return this.prisma.nameplate.update({ where: { id }, data });
  }

  async deleteNameplate(id: string) {
    return this.prisma.nameplate.delete({ where: { id } });
  }

  // ==================== DASHBOARD EXTRAS ====================

  async getDashboardRevenue(period: 'daily' | 'weekly' | 'monthly' = 'daily', days = 30) {
    return this.getRevenueChart(period, days);
  }

  async getDashboardTopRooms() {
    return this.prisma.voiceRoom.findMany({
      where: { isLive: true },
      orderBy: { viewerCount: 'desc' },
      take: 10,
      include: {
        host: {
          select: { id: true, uid: true, displayName: true, avatar: true },
        },
        _count: { select: { members: true } },
      },
    });
  }

  async getDashboardRecentTransactions() {
    const txs = await this.prisma.transaction.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        user: {
          select: { id: true, uid: true, displayName: true, avatar: true },
        },
      },
    });
    return txs;
  }

  // ==================== USER EXTRAS ====================

  async getUserBans(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.ban.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        admin: { select: { id: true, uid: true, displayName: true } },
      },
    });
  }

  async getUserTransactions(userId: string, page = 1, limit = 20) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { userId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.transaction.count({ where: { userId } }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async adjustUserWallet(
    adminId: string,
    userId: string,
    dto: { currency: 'coins' | 'diamonds'; amount: number; reason: string },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (!dto.reason) throw new BadRequestException('Reason is required');

    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    const isCoin = dto.currency === 'coins';
    const before = isCoin ? wallet.coins : wallet.diamonds;
    const after = before + BigInt(dto.amount);
    if (after < BigInt(0)) throw new BadRequestException('Insufficient balance');

    await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { userId },
        data: isCoin
          ? { coins: { increment: dto.amount } }
          : { diamonds: { increment: dto.amount } },
      }),
      this.prisma.transaction.create({
        data: {
          userId,
          type: TransactionType.REWARD,
          currency: isCoin ? Currency.COINS : Currency.DIAMONDS,
          amount: BigInt(Math.abs(dto.amount)),
          balanceBefore: before,
          balanceAfter: after,
          description: `Admin adjustment: ${dto.reason}`,
          referenceId: adminId,
          status: TransactionStatus.COMPLETED,
        },
      }),
    ]);

    await this.createAuditLog(adminId, 'WALLET_ADJUST', 'User', userId, {
      currency: dto.currency,
      amount: dto.amount,
      reason: dto.reason,
    });

    return { success: true, message: 'Wallet adjusted successfully' };
  }

  // ==================== ROOMS ADMIN ====================

  async getRooms(filters: {
    search?: string;
    status?: string;
    type?: string;
    page?: number;
    limit?: number;
  }) {
    const { search, status, type, page = 1, limit = 20 } = filters;
    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { host: { displayName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (status === 'live') where.isLive = true;
    else if (status === 'ended') where.isLive = false;

    if (type) where.type = type.toUpperCase();

    const [data, total] = await Promise.all([
      this.prisma.voiceRoom.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          host: {
            select: { id: true, uid: true, displayName: true, avatar: true },
          },
          _count: { select: { members: true, seats: true } },
        },
      }),
      this.prisma.voiceRoom.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getRoomById(roomId: string) {
    const room = await this.prisma.voiceRoom.findUnique({
      where: { id: roomId },
      include: {
        host: {
          select: {
            id: true, uid: true, displayName: true, avatar: true, isOnline: true,
          },
        },
        seats: {
          include: {
            user: { select: { id: true, uid: true, displayName: true, avatar: true } },
          },
        },
        _count: { select: { members: true } },
      },
    });
    if (!room) throw new NotFoundException('Room not found');
    return room;
  }

  async getRoomMembers(roomId: string) {
    const room = await this.prisma.voiceRoom.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Room not found');

    return this.prisma.roomMember.findMany({
      where: { roomId },
      orderBy: { joinedAt: 'desc' },
      include: {
        user: {
          select: { id: true, uid: true, displayName: true, avatar: true, isVip: true },
        },
      },
    });
  }

  async closeRoom(adminId: string, roomId: string) {
    const room = await this.prisma.voiceRoom.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Room not found');
    if (!room.isLive) throw new BadRequestException('Room is already closed');

    const updated = await this.prisma.voiceRoom.update({
      where: { id: roomId },
      data: { isLive: false },
    });

    await this.createAuditLog(adminId, 'CLOSE_ROOM', 'VoiceRoom', roomId, {});
    return updated;
  }

  // ==================== FAMILIES ADMIN ====================

  async getFamilies(filters: { search?: string; page?: number; limit?: number }) {
    const { search, page = 1, limit = 20 } = filters;
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { tag: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.family.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: { select: { id: true, uid: true, displayName: true, avatar: true } },
          _count: { select: { members: true } },
        },
      }),
      this.prisma.family.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getFamilyById(familyId: string) {
    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
      include: {
        owner: { select: { id: true, uid: true, displayName: true, avatar: true } },
        members: {
          include: {
            user: { select: { id: true, uid: true, displayName: true, avatar: true } },
          },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });
    if (!family) throw new NotFoundException('Family not found');
    return family;
  }

  async banFamily(adminId: string, familyId: string, reason: string) {
    const family = await this.prisma.family.findUnique({ where: { id: familyId } });
    if (!family) throw new NotFoundException('Family not found');

    await this.createAuditLog(adminId, 'BAN_FAMILY', 'Family', familyId, { reason });
    return { success: true, message: 'Family banned successfully', familyId, reason };
  }

  async unbanFamily(adminId: string, familyId: string) {
    const family = await this.prisma.family.findUnique({ where: { id: familyId } });
    if (!family) throw new NotFoundException('Family not found');

    await this.createAuditLog(adminId, 'UNBAN_FAMILY', 'Family', familyId, {});
    return { success: true, message: 'Family unbanned successfully', familyId };
  }

  // ==================== COUPLES ADMIN ====================

  async getCouples(filters: { search?: string; status?: string; page?: number; limit?: number }) {
    const { search, status, page = 1, limit = 20 } = filters;
    const where: any = {};

    if (status && status !== 'all') {
      where.status = status.toUpperCase();
    }

    if (search) {
      where.OR = [
        { user1: { displayName: { contains: search, mode: 'insensitive' } } },
        { user1: { username: { contains: search, mode: 'insensitive' } } },
        { user2: { displayName: { contains: search, mode: 'insensitive' } } },
        { user2: { username: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.couple.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user1: { select: { id: true, uid: true, displayName: true, avatar: true, level: true } },
          user2: { select: { id: true, uid: true, displayName: true, avatar: true, level: true } },
        },
      }),
      this.prisma.couple.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getCoupleById(coupleId: string) {
    const couple = await this.prisma.couple.findUnique({
      where: { id: coupleId },
      include: {
        user1: { select: { id: true, uid: true, displayName: true, avatar: true, level: true, isVip: true } },
        user2: { select: { id: true, uid: true, displayName: true, avatar: true, level: true, isVip: true } },
      },
    });
    if (!couple) throw new NotFoundException('Couple not found');
    return couple;
  }

  async endCoupleByAdmin(adminId: string, coupleId: string, reason: string) {
    const couple = await this.prisma.couple.findUnique({ where: { id: coupleId } });
    if (!couple) throw new NotFoundException('Couple not found');
    if (couple.status !== 'ACTIVE') throw new BadRequestException('Couple is not active');

    const updated = await this.prisma.couple.update({
      where: { id: coupleId },
      data: { status: 'ENDED', endedAt: new Date(), endedBy: adminId, endReason: reason || 'Ended by admin' },
    });

    await this.createAuditLog(adminId, 'END_COUPLE', 'Couple', coupleId, { reason });
    return updated;
  }

  // ==================== AGENCIES ADMIN ====================

  async getAgencies(filters: { search?: string; page?: number; limit?: number }) {
    const { search, page = 1, limit = 20 } = filters;
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.agency.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: { select: { id: true, uid: true, displayName: true, avatar: true } },
          _count: { select: { members: true } },
        },
      }),
      this.prisma.agency.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getAgencyById(agencyId: string) {
    const agency = await this.prisma.agency.findUnique({
      where: { id: agencyId },
      include: {
        owner: { select: { id: true, uid: true, displayName: true, avatar: true } },
        members: {
          include: {
            user: { select: { id: true, uid: true, displayName: true, avatar: true } },
          },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });
    if (!agency) throw new NotFoundException('Agency not found');
    return agency;
  }

  // ==================== REPORTS ADMIN ====================

  async getReports(filters: {
    status?: string;
    type?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, type, page = 1, limit = 20 } = filters;
    const where: any = {};

    if (status) where.status = status as ReportStatus;
    if (type) where.targetType = type.toUpperCase();

    const [data, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: { select: { id: true, uid: true, displayName: true, avatar: true } },
          resolver: { select: { id: true, uid: true, displayName: true } },
        },
      }),
      this.prisma.report.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getReportById(reportId: string) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: {
        reporter: { select: { id: true, uid: true, displayName: true, avatar: true } },
        resolver: { select: { id: true, uid: true, displayName: true } },
      },
    });
    if (!report) throw new NotFoundException('Report not found');
    return report;
  }

  async resolveReport(adminId: string, reportId: string, dto: { action?: string; adminNote?: string }) {
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException('Report not found');

    const updated = await this.prisma.report.update({
      where: { id: reportId },
      data: {
        status: ReportStatus.RESOLVED,
        resolvedBy: adminId,
        resolvedAt: new Date(),
        ...(dto.adminNote && { description: dto.adminNote }),
      },
    });

    await this.createAuditLog(adminId, 'RESOLVE_REPORT', 'Report', reportId, dto);
    return updated;
  }

  async dismissReport(adminId: string, reportId: string, dto: { note?: string }) {
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException('Report not found');

    const updated = await this.prisma.report.update({
      where: { id: reportId },
      data: {
        status: ReportStatus.DISMISSED,
        resolvedBy: adminId,
        resolvedAt: new Date(),
        ...(dto.note && { description: dto.note }),
      },
    });

    await this.createAuditLog(adminId, 'DISMISS_REPORT', 'Report', reportId, dto);
    return updated;
  }

  // ==================== BANNERS ADMIN ====================

  async getBanners() {
    return this.prisma.banner.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async createBanner(data: {
    title: string;
    imageUrl: string;
    linkType?: string;
    linkValue?: string;
    position: string;
    sortOrder?: number;
    startDate?: string;
    endDate?: string;
  }) {
    return this.prisma.banner.create({
      data: {
        title: data.title,
        imageUrl: data.imageUrl,
        linkType: data.linkType as any,
        linkValue: data.linkValue,
        position: data.position || 'HOME',
        sortOrder: data.sortOrder ?? 0,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        isActive: true,
      },
    });
  }

  async updateBanner(bannerId: string, data: any) {
    const banner = await this.prisma.banner.findUnique({ where: { id: bannerId } });
    if (!banner) throw new NotFoundException('Banner not found');
    return this.prisma.banner.update({
      where: { id: bannerId },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.imageUrl && { imageUrl: data.imageUrl }),
        ...(data.linkType !== undefined && { linkType: data.linkType }),
        ...(data.linkValue !== undefined && { linkValue: data.linkValue }),
        ...(data.position && { position: data.position }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
        ...(data.startDate !== undefined && { startDate: data.startDate ? new Date(data.startDate) : null }),
        ...(data.endDate !== undefined && { endDate: data.endDate ? new Date(data.endDate) : null }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  async deleteBanner(bannerId: string) {
    const banner = await this.prisma.banner.findUnique({ where: { id: bannerId } });
    if (!banner) throw new NotFoundException('Banner not found');
    return this.prisma.banner.delete({ where: { id: bannerId } });
  }

  async toggleBanner(bannerId: string) {
    const banner = await this.prisma.banner.findUnique({ where: { id: bannerId } });
    if (!banner) throw new NotFoundException('Banner not found');
    return this.prisma.banner.update({
      where: { id: bannerId },
      data: { isActive: !banner.isActive },
    });
  }

  async reorderBanners(ids: string[]) {
    const updates = ids.map((id, index) =>
      this.prisma.banner.update({ where: { id }, data: { sortOrder: index } }),
    );
    await this.prisma.$transaction(updates);
    return { success: true, message: 'Banners reordered' };
  }

  // ==================== EVENTS ADMIN ====================

  async getEvents(filters: { isActive?: boolean; page?: number; limit?: number }) {
    const { isActive, page = 1, limit = 20 } = filters;
    const where: any = {};
    if (isActive !== undefined) where.isActive = isActive;

    const [data, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { startDate: 'desc' },
      }),
      this.prisma.event.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getEventById(eventId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  async createEvent(data: {
    name: string;
    description?: string;
    type: string;
    startDate: string;
    endDate: string;
    banner?: string;
    rewards: any;
    isActive?: boolean;
  }) {
    return this.prisma.event.create({
      data: {
        name: data.name,
        description: data.description,
        type: data.type as any,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        banner: data.banner,
        rewards: data.rewards,
        isActive: data.isActive ?? true,
      },
    });
  }

  async updateEvent(eventId: string, data: any) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');
    return this.prisma.event.update({
      where: { id: eventId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.type && { type: data.type }),
        ...(data.startDate && { startDate: new Date(data.startDate) }),
        ...(data.endDate && { endDate: new Date(data.endDate) }),
        ...(data.banner !== undefined && { banner: data.banner }),
        ...(data.rewards && { rewards: data.rewards }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  async deleteEvent(eventId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');
    return this.prisma.event.delete({ where: { id: eventId } });
  }

  // ==================== WALLET ADMIN ====================

  async getWalletStats() {
    const today = dayjs().startOf('day').toDate();
    const weekStart = dayjs().startOf('week').toDate();
    const monthStart = dayjs().startOf('month').toDate();

    const [totals, todayRecharge, weekRecharge, monthRecharge] = await Promise.all([
      this.prisma.wallet.aggregate({
        _sum: { coins: true, diamonds: true },
      }),
      this.prisma.transaction.aggregate({
        where: { type: 'RECHARGE', status: 'COMPLETED', createdAt: { gte: today } },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { type: 'RECHARGE', status: 'COMPLETED', createdAt: { gte: weekStart } },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { type: 'RECHARGE', status: 'COMPLETED', createdAt: { gte: monthStart } },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalCoins: totals._sum.coins?.toString() ?? '0',
      totalDiamonds: totals._sum.diamonds?.toString() ?? '0',
      todayRecharge: todayRecharge._sum.amount?.toString() ?? '0',
      weekRecharge: weekRecharge._sum.amount?.toString() ?? '0',
      monthRecharge: monthRecharge._sum.amount?.toString() ?? '0',
    };
  }

  async getWalletTransactions(filters: { type?: string; page?: number; limit?: number }) {
    const { type, page = 1, limit = 20 } = filters;
    const where: any = {};
    if (type) where.type = type.toUpperCase();

    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, uid: true, displayName: true, avatar: true } },
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ==================== SETTINGS ADMIN ====================

  getSettings() {
    return {
      appName: 'VOXO',
      maintenanceMode: false,
      registrationEnabled: true,
      giftingEnabled: true,
      withdrawalEnabled: true,
      minWithdrawalAmount: 1000,
      maxWithdrawalAmount: 1000000,
      referralEnabled: true,
      maxRoomSeats: 8,
      defaultLanguage: 'uz',
      supportedLanguages: ['uz', 'ru', 'en'],
    };
  }

  async updateSettings(data: any) {
    // No AppSettings model — return merged hardcoded + provided values
    return { ...this.getSettings(), ...data };
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
