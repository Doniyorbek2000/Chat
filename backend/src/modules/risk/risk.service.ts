import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RiskEventType, RiskLevel } from '@prisma/client';

function calcLevel(score: number): RiskLevel {
  if (score <= 30) return RiskLevel.LOW;
  if (score <= 60) return RiskLevel.MEDIUM;
  if (score <= 100) return RiskLevel.HIGH;
  return RiskLevel.CRITICAL;
}

@Injectable()
export class RiskService {
  constructor(private prisma: PrismaService) {}

  async recordEvent(userId: string, eventType: RiskEventType, metadata?: any, ruleId?: string) {
    const rules = await this.prisma.riskRule.findMany({
      where: { eventType, isActive: true },
    });

    const totalDelta = rules.reduce((sum, r) => sum + r.scoreDelta, 0);

    await this.prisma.riskEvent.create({
      data: { userId, eventType, scoreDelta: totalDelta, metadata, ruleId },
    });

    const current = await this.prisma.riskScore.findUnique({ where: { userId } });
    const newScore = Math.min((current?.score ?? 0) + totalDelta, 200);
    const newLevel = calcLevel(newScore);
    const wasHighRisk = current && (current.level === 'HIGH' || current.level === 'CRITICAL');
    const isHighRisk = newLevel === 'HIGH' || newLevel === 'CRITICAL';

    await this.prisma.riskScore.upsert({
      where: { userId },
      update: { score: newScore, level: newLevel },
      create: { userId, score: newScore, level: newLevel },
    });

    // Log level change to audit
    if (isHighRisk && !wasHighRisk) {
      await this.prisma.auditLog.create({
        data: {
          adminId: 'system',
          action: 'RISK_LEVEL_ESCALATED',
          targetId: userId,
          targetType: 'User',
          details: { eventType, newLevel, newScore },
        },
      });
    }

    return { score: newScore, level: newLevel };
  }

  async checkRisk(userId: string) {
    return this.prisma.riskScore.findUnique({ where: { userId } });
  }

  async isWithdrawalBlocked(userId: string): Promise<boolean> {
    const risk = await this.prisma.riskScore.findUnique({ where: { userId } });
    if (!risk) return false;
    return risk.level === 'HIGH' || risk.level === 'CRITICAL' || risk.isFlagged;
  }

  async getMyRiskLevel(userId: string) {
    const risk = await this.prisma.riskScore.findUnique({ where: { userId } });
    return { level: risk?.level ?? 'LOW' };
  }

  async flagUser(userId: string, adminId: string) {
    const riskScore = await this.prisma.riskScore.upsert({
      where: { userId },
      update: { isFlagged: true, flaggedAt: new Date(), flaggedBy: adminId },
      create: { userId, score: 0, level: RiskLevel.LOW, isFlagged: true, flaggedAt: new Date(), flaggedBy: adminId },
    });

    await this.prisma.auditLog.create({
      data: {
        adminId,
        action: 'USER_RISK_FLAGGED',
        targetId: userId,
        targetType: 'User',
        details: { riskScore: riskScore.score },
      },
    });

    return { success: true };
  }

  async clearUser(userId: string, adminId: string) {
    await this.prisma.riskScore.upsert({
      where: { userId },
      update: { score: 0, level: RiskLevel.LOW, isFlagged: false, clearedAt: new Date() },
      create: { userId, score: 0, level: RiskLevel.LOW },
    });

    await this.prisma.auditLog.create({
      data: {
        adminId,
        action: 'USER_RISK_CLEARED',
        targetId: userId,
        targetType: 'User',
      },
    });

    return { success: true };
  }

  async detectMultiAccount(deviceId: string, userId: string) {
    await this.prisma.userDevice.upsert({
      where: { userId_deviceId: { userId, deviceId } },
      update: {},
      create: { userId, deviceId },
    });

    const otherAccounts = await this.prisma.userDevice.findMany({
      where: { deviceId, userId: { not: userId } },
    });

    if (otherAccounts.length > 0) {
      await this.recordEvent(userId, RiskEventType.MULTI_ACCOUNT, {
        deviceId,
        otherUserIds: otherAccounts.map((a) => a.userId),
      });
    }
  }

  async detectGiftSpam(userId: string, roomId: string) {
    const recentCount = await this.prisma.giftTransaction.count({
      where: {
        senderId: userId,
        roomId,
        createdAt: { gte: new Date(Date.now() - 60000) },
      },
    });

    if (recentCount > 20) {
      await this.recordEvent(userId, RiskEventType.GIFT_SPAM, {
        roomId,
        count: recentCount,
      });
    }
  }

  async getUserRiskEvents(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.riskEvent.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.riskEvent.count({ where: { userId } }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async listRiskEvents(userId?: string, eventType?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (userId) where.userId = userId;
    if (eventType) where.eventType = eventType as RiskEventType;

    const [data, total] = await Promise.all([
      this.prisma.riskEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, displayName: true, uid: true } } },
      }),
      this.prisma.riskEvent.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async listFlaggedUsers(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.riskScore.findMany({
        where: { OR: [{ isFlagged: true }, { level: { in: ['HIGH', 'CRITICAL'] as RiskLevel[] } }] },
        skip,
        take: limit,
        orderBy: { score: 'desc' },
        include: { user: { select: { id: true, displayName: true, uid: true, avatar: true } } },
      }),
      this.prisma.riskScore.count({
        where: { OR: [{ isFlagged: true }, { level: { in: ['HIGH', 'CRITICAL'] as RiskLevel[] } }] },
      }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async listRiskRules() {
    return this.prisma.riskRule.findMany({ orderBy: { createdAt: 'asc' } });
  }

  async createRiskRule(dto: any) {
    return this.prisma.riskRule.create({ data: dto });
  }

  async updateRiskRule(id: string, dto: any) {
    return this.prisma.riskRule.update({ where: { id }, data: dto });
  }

  async toggleRiskRule(id: string) {
    const rule = await this.prisma.riskRule.findUnique({ where: { id } });
    if (!rule) throw new Error('Rule not found');
    return this.prisma.riskRule.update({ where: { id }, data: { isActive: !rule.isActive } });
  }
}
