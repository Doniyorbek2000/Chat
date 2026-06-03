import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import {
  FamilyMemberRole,
  BattleStatus,
  TransactionType,
} from '@prisma/client';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import dayjs from 'dayjs';

@Injectable()
export class FamilyService {
  private readonly logger = new Logger(FamilyService.name);

  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
    @InjectRedis() private redis: Redis,
  ) {}

  async createFamily(
    ownerId: string,
    data: {
      name: string;
      tag: string;
      description?: string;
      isPublic?: boolean;
      requireApproval?: boolean;
      country?: string;
    },
  ) {
    const existingFamily = await this.prisma.familyMember.findFirst({
      where: { userId: ownerId },
    });

    if (existingFamily) {
      throw new BadRequestException('You are already in a family');
    }

    const existing = await this.prisma.family.findFirst({
      where: {
        OR: [{ name: data.name }, { tag: data.tag.toUpperCase() }],
      },
    });

    if (existing) {
      throw new ConflictException('Family name or tag already exists');
    }

    const family = await this.prisma.family.create({
      data: {
        name: data.name,
        tag: data.tag.toUpperCase(),
        description: data.description,
        ownerId,
        isPublic: data.isPublic ?? true,
        requireApproval: data.requireApproval ?? false,
        country: data.country,
        members: {
          create: {
            userId: ownerId,
            role: FamilyMemberRole.OWNER,
          },
        },
      },
      include: {
        owner: {
          select: { id: true, uid: true, displayName: true, avatar: true },
        },
        _count: { select: { members: true } },
      },
    });

    return family;
  }

  async getFamily(familyId: string) {
    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
      include: {
        owner: {
          select: {
            id: true,
            uid: true,
            displayName: true,
            avatar: true,
            isVip: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                uid: true,
                displayName: true,
                avatar: true,
                isVip: true,
                vipLevel: true,
                level: true,
                isOnline: true,
              },
            },
          },
          orderBy: [{ role: 'asc' }, { contribution: 'desc' }],
        },
        _count: { select: { members: true } },
      },
    });

    if (!family) throw new NotFoundException('Family not found');
    return family;
  }

  async getFamilies(filters: {
    country?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: any = { isPublic: true };
    if (filters.country) where.country = filters.country;
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { tag: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [families, total] = await Promise.all([
      this.prisma.family.findMany({
        where,
        include: {
          owner: {
            select: { id: true, uid: true, displayName: true, avatar: true },
          },
          _count: { select: { members: true } },
        },
        skip,
        take: limit,
        orderBy: [{ level: 'desc' }, { xp: 'desc' }],
      }),
      this.prisma.family.count({ where }),
    ]);

    return {
      data: families,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async joinFamily(userId: string, familyId: string) {
    const existingMembership = await this.prisma.familyMember.findFirst({
      where: { userId },
    });

    if (existingMembership) {
      throw new BadRequestException('You are already in a family');
    }

    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
      include: { _count: { select: { members: true } } },
    });

    if (!family) throw new NotFoundException('Family not found');

    if (family._count.members >= family.maxMembers) {
      throw new BadRequestException('Family is full');
    }

    if (!family.isPublic) {
      throw new ForbiddenException('This family is private');
    }

    const member = await this.prisma.familyMember.create({
      data: {
        familyId,
        userId,
        role: FamilyMemberRole.MEMBER,
      },
    });

    return member;
  }

  async leaveFamily(userId: string, familyId: string) {
    const member = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId } },
    });

    if (!member) throw new NotFoundException('You are not in this family');

    if (member.role === FamilyMemberRole.OWNER) {
      throw new BadRequestException(
        'Owner cannot leave family. Transfer ownership first or disband.',
      );
    }

    await this.prisma.familyMember.delete({
      where: { familyId_userId: { familyId, userId } },
    });

    return { message: 'Left family successfully' };
  }

  async inviteMember(adminId: string, familyId: string, targetUserId: string) {
    const adminMember = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId: adminId } },
    });

    if (
      !adminMember ||
      ![
        FamilyMemberRole.OWNER,
        FamilyMemberRole.CO_OWNER,
        FamilyMemberRole.ADMIN,
      ].includes(adminMember.role as any)
    ) {
      throw new ForbiddenException(
        'Insufficient permissions to invite members',
      );
    }

    const existingMembership = await this.prisma.familyMember.findFirst({
      where: { userId: targetUserId },
    });

    if (existingMembership) {
      throw new BadRequestException('User is already in a family');
    }

    return { message: 'Invitation sent', familyId, targetUserId };
  }

  async promoteMember(
    adminId: string,
    familyId: string,
    targetUserId: string,
    newRole: FamilyMemberRole,
  ) {
    const adminMember = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId: adminId } },
    });

    if (!adminMember || adminMember.role !== FamilyMemberRole.OWNER) {
      throw new ForbiddenException('Only owner can promote members');
    }

    const targetMember = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId: targetUserId } },
    });

    if (!targetMember) throw new NotFoundException('Member not found');

    return this.prisma.familyMember.update({
      where: { familyId_userId: { familyId, userId: targetUserId } },
      data: { role: newRole },
    });
  }

  async kickMember(adminId: string, familyId: string, targetUserId: string) {
    const adminMember = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId: adminId } },
    });

    if (
      !adminMember ||
      ![
        FamilyMemberRole.OWNER,
        FamilyMemberRole.CO_OWNER,
        FamilyMemberRole.ADMIN,
      ].includes(adminMember.role as any)
    ) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const targetMember = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId: targetUserId } },
    });

    if (!targetMember) throw new NotFoundException('Member not found');

    if (targetMember.role === FamilyMemberRole.OWNER) {
      throw new BadRequestException('Cannot kick family owner');
    }

    await this.prisma.familyMember.delete({
      where: { familyId_userId: { familyId, userId: targetUserId } },
    });

    return { message: 'Member kicked successfully' };
  }

  async updateFamily(ownerId: string, familyId: string, data: any) {
    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
    });
    if (!family) throw new NotFoundException('Family not found');
    if (family.ownerId !== ownerId)
      throw new ForbiddenException('Only owner can update family');

    return this.prisma.family.update({
      where: { id: familyId },
      data,
    });
  }

  async getFamilyRanking(
    period: 'daily' | 'weekly' | 'monthly' = 'weekly',
    limit = 50,
  ) {
    const key = `family_ranking:${period}`;
    const cached = await this.redis.get(key);

    if (cached) {
      return JSON.parse(cached);
    }

    const families = await this.prisma.family.findMany({
      orderBy: [{ level: 'desc' }, { xp: 'desc' }, { treasury: 'desc' }],
      take: limit,
      include: {
        owner: {
          select: { id: true, uid: true, displayName: true, avatar: true },
        },
        _count: { select: { members: true } },
      },
    });

    await this.redis.set(key, JSON.stringify(families), 'EX', 300);
    return families;
  }

  async donateToTreasury(userId: string, familyId: string, amount: number) {
    const member = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId } },
    });

    if (!member) throw new ForbiddenException('You are not in this family');

    const donateAmount = BigInt(amount);

    await this.walletService.deductDiamonds(
      userId,
      Number(donateAmount),
      `Donation to family treasury`,
    );

    await this.prisma.family.update({
      where: { id: familyId },
      data: {
        treasury: { increment: donateAmount },
        xp: { increment: BigInt(amount) },
      },
    });

    await this.prisma.familyMember.update({
      where: { familyId_userId: { familyId, userId } },
      data: { contribution: { increment: donateAmount } },
    });

    return { message: `Donated ${amount} diamonds to family treasury` };
  }

  async startBattle(
    ownerId: string,
    challengerFamilyId: string,
    defenderFamilyId: string,
    duration = 3600,
  ) {
    const challengerMember = await this.prisma.familyMember.findUnique({
      where: {
        familyId_userId: { familyId: challengerFamilyId, userId: ownerId },
      },
    });

    if (!challengerMember || challengerMember.role !== FamilyMemberRole.OWNER) {
      throw new ForbiddenException('Only family owner can start battles');
    }

    const defenderFamily = await this.prisma.family.findUnique({
      where: { id: defenderFamilyId },
    });
    if (!defenderFamily)
      throw new NotFoundException('Defender family not found');

    const activeBattle = await this.prisma.familyBattle.findFirst({
      where: {
        OR: [
          { challengerFamilyId, status: BattleStatus.ACTIVE },
          { defenderFamilyId: challengerFamilyId, status: BattleStatus.ACTIVE },
        ],
      },
    });

    if (activeBattle) {
      throw new BadRequestException('Family is already in an active battle');
    }

    const startTime = new Date();
    const endTime = dayjs().add(duration, 'second').toDate();

    const battle = await this.prisma.familyBattle.create({
      data: {
        challengerFamilyId,
        defenderFamilyId,
        startTime,
        endTime,
        status: BattleStatus.ACTIVE,
      },
    });

    return battle;
  }

  async getFamilyBattles(familyId: string) {
    return this.prisma.familyBattle.findMany({
      where: {
        OR: [{ challengerFamilyId: familyId }, { defenderFamilyId: familyId }],
      },
      include: {
        challengerFamily: {
          select: { id: true, name: true, tag: true, avatar: true },
        },
        defenderFamily: {
          select: { id: true, name: true, tag: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }
}
