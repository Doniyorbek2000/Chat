import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { ApplyReferralCodeDto, CreateRebateRuleDto, UpdateRebateRuleDto } from './dto/referral.dto';
// nanoid v3 is CommonJS compatible
const { nanoid } = require('nanoid');

@Injectable()
export class ReferralsService {
  constructor(
    private prisma: PrismaService,
    private wallet: WalletService,
  ) {}

  private generateCode(uid: string): string {
    // 8-char uppercase code based on uid + random
    return (uid.slice(-4) + nanoid(4)).toUpperCase();
  }

  async getOrCreateCode(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { uid: true, displayName: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const existing = await this.prisma.referralCode.findUnique({ where: { userId } });
    if (existing) return existing;

    let code = this.generateCode(user.uid);
    // ensure unique
    while (await this.prisma.referralCode.findUnique({ where: { code } })) {
      code = (nanoid(8)).toUpperCase();
    }

    return this.prisma.referralCode.create({ data: { userId, code } });
  }

  async getMyReferralInfo(userId: string) {
    const [codeRecord, relations, rewards] = await Promise.all([
      this.getOrCreateCode(userId),
      this.prisma.referralRelation.findMany({
        where: { referrerId: userId },
        include: {
          referee: { select: { id: true, uid: true, displayName: true, avatar: true, level: true } },
          rewards: { where: { userId } },
        },
      }),
      this.prisma.referralReward.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    const totalEarned = rewards.filter(r => r.isPaid).reduce((s, r) => s + r.coins, 0);
    const pendingCoins = rewards.filter(r => !r.isPaid).reduce((s, r) => s + r.coins, 0);

    return {
      code: codeRecord.code,
      shareLink: `https://voxo.app/join/${codeRecord.code}`,
      friendsCount: relations.length,
      totalEarned,
      pendingCoins,
      friends: relations.map(r => ({
        user: r.referee,
        rewardCoins: r.rewards.reduce((s: number, rw: any) => s + rw.coins, 0),
        joinedAt: r.createdAt,
      })),
    };
  }

  async applyCode(userId: string, dto: ApplyReferralCodeDto) {
    // Self-referral check via existing code lookup
    const myCode = await this.prisma.referralCode.findUnique({ where: { userId } });
    if (myCode?.code === dto.code) {
      throw new BadRequestException('Cannot use your own referral code');
    }

    // Already referred?
    const existingRelation = await this.prisma.referralRelation.findUnique({
      where: { refereeId: userId },
    });
    if (existingRelation) {
      throw new BadRequestException('You have already used a referral code');
    }

    // Find code
    const codeRecord = await this.prisma.referralCode.findUnique({ where: { code: dto.code } });
    if (!codeRecord) throw new NotFoundException('Referral code not found');

    if (codeRecord.userId === userId) {
      throw new BadRequestException('Cannot use your own referral code');
    }

    // Create relation
    const relation = await this.prisma.referralRelation.create({
      data: {
        referrerId: codeRecord.userId,
        refereeId: userId,
        codeId: codeRecord.id,
        deviceInfo: dto.deviceId,
        ipHash: dto.ipHash,
      },
    });

    // Increment usage count
    await this.prisma.referralCode.update({
      where: { id: codeRecord.id },
      data: { usedCount: { increment: 1 } },
    });

    return { success: true, referrerId: codeRecord.userId };
  }

  async processRechargeRebate(refereeId: string, rechargeUsdAmount: number) {
    // Called after successful recharge - finds referral chain and pays rebates
    const relation = await this.prisma.referralRelation.findUnique({
      where: { refereeId },
    });
    if (!relation || relation.isSuspicious) return;

    const rules = await this.prisma.referralRebateRule.findMany({
      where: { isActive: true },
      orderBy: { level: 'asc' },
    });

    const levelOneRule = rules.find(r => r.level === 1);
    if (!levelOneRule || rechargeUsdAmount < levelOneRule.minRechargeUSD) return;

    // Level 1: direct referrer gets rebate
    const rebateCoins = Math.floor(rechargeUsdAmount * levelOneRule.rebatePercent);
    if (rebateCoins > 0) {
      await this.prisma.referralReward.create({
        data: {
          relationId: relation.id,
          userId: relation.referrerId,
          coins: rebateCoins,
          reason: `Level 1 rebate: friend recharged $${rechargeUsdAmount}`,
        },
      });

      // Auto-pay the reward
      await this.wallet.addCoins(
        relation.referrerId,
        rebateCoins,
        `Referral rebate: friend recharge`,
        relation.id,
      );

      await this.prisma.referralReward.updateMany({
        where: { relationId: relation.id, userId: relation.referrerId, isPaid: false },
        data: { isPaid: true, paidAt: new Date() },
      });
    }

    // Level 2: referrer's referrer
    const levelTwoRule = rules.find(r => r.level === 2);
    if (!levelTwoRule) return;

    const grandRelation = await this.prisma.referralRelation.findUnique({
      where: { refereeId: relation.referrerId },
    });
    if (!grandRelation || grandRelation.isSuspicious) return;

    const level2Coins = Math.floor(rechargeUsdAmount * levelTwoRule.rebatePercent);
    if (level2Coins > 0) {
      await this.prisma.referralReward.create({
        data: {
          relationId: grandRelation.id,
          userId: grandRelation.referrerId,
          coins: level2Coins,
          reason: `Level 2 rebate: friend-of-friend recharged`,
        },
      });

      await this.wallet.addCoins(
        grandRelation.referrerId,
        level2Coins,
        `Referral L2 rebate`,
        grandRelation.id,
      );
    }
  }

  async getRebateHistory(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.referralReward.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.referralReward.count({ where: { userId } }),
    ]);
    return { items, total, page, limit };
  }

  async getRebateRanking(limit = 20) {
    const result = await this.prisma.referralReward.groupBy({
      by: ['userId'],
      where: { isPaid: true },
      _sum: { coins: true },
      orderBy: { _sum: { coins: 'desc' } },
      take: limit,
    });

    const userIds = result.map(r => r.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, uid: true, displayName: true, avatar: true, level: true },
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    return result.map((r, i) => ({
      rank: i + 1,
      user: userMap.get(r.userId),
      totalCoins: r._sum.coins,
    }));
  }

  // Admin methods
  async adminGetReferrals(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.referralRelation.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          referrer: { select: { id: true, displayName: true, avatar: true } },
          referee: { select: { id: true, displayName: true, avatar: true } },
          code: { select: { code: true } },
          rewards: { select: { coins: true, isPaid: true } },
        },
      }),
      this.prisma.referralRelation.count(),
    ]);
    return { items, total, page, limit };
  }

  async adminGetRules() {
    return this.prisma.referralRebateRule.findMany({ orderBy: { level: 'asc' } });
  }

  async adminCreateRule(dto: CreateRebateRuleDto) {
    return this.prisma.referralRebateRule.upsert({
      where: { level: dto.level },
      update: {
        rebatePercent: dto.rebatePercent,
        minRechargeUSD: dto.minRechargeUSD,
        isActive: dto.isActive ?? true,
      },
      create: {
        level: dto.level,
        rebatePercent: dto.rebatePercent,
        minRechargeUSD: dto.minRechargeUSD ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async adminUpdateRule(id: string, dto: UpdateRebateRuleDto) {
    return this.prisma.referralRebateRule.update({ where: { id }, data: dto });
  }
}
