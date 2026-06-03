import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { CreateAgencyDto } from './dto/agency.dto';
import { AgencyMemberRole } from '@prisma/client';

const AGENCY_CREATION_COST = 10000; // coins

@Injectable()
export class AgencyService {
  private readonly logger = new Logger(AgencyService.name);

  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
  ) {}

  // ==================== CREATE AGENCY ====================

  async createAgency(ownerId: string, dto: CreateAgencyDto) {
    // Check if user already owns an agency
    const existingAgency = await this.prisma.agency.findUnique({
      where: { ownerId },
    });
    if (existingAgency) {
      throw new BadRequestException('You already own an agency');
    }

    // Check if name is taken
    const nameTaken = await this.prisma.agency.findUnique({
      where: { name: dto.name },
    });
    if (nameTaken) {
      throw new BadRequestException('Agency name is already taken');
    }

    // Deduct creation fee
    await this.walletService.deductCoins(
      ownerId,
      AGENCY_CREATION_COST,
      `Agency creation: ${dto.name}`,
    );

    // Create agency and add owner as member
    const agency = await this.prisma.agency.create({
      data: {
        ownerId,
        name: dto.name,
        description: dto.description,
        logo: dto.logo,
        commission: dto.commission,
        memberCount: 1,
        members: {
          create: {
            userId: ownerId,
            role: AgencyMemberRole.OWNER,
          },
        },
      },
      include: {
        owner: {
          select: { id: true, uid: true, displayName: true, avatar: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, uid: true, displayName: true, avatar: true },
            },
          },
        },
      },
    });

    return agency;
  }

  // ==================== GET AGENCY ====================

  async getAgency(id: string) {
    const agency = await this.prisma.agency.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            uid: true,
            displayName: true,
            avatar: true,
            isVip: true,
            vipLevel: true,
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
                isOnline: true,
                wallet: { select: { totalEarned: true } },
              },
            },
          },
          orderBy: { totalEarnings: 'desc' },
        },
      },
    });

    if (!agency) throw new NotFoundException('Agency not found');

    return {
      ...agency,
      totalEarnings: Number(agency.totalEarnings),
      members: agency.members.map((m) => ({
        ...m,
        totalEarnings: Number(m.totalEarnings),
      })),
    };
  }

  // ==================== LIST AGENCIES ====================

  async getAgencies(page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.prisma.agency.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { totalEarnings: 'desc' },
        include: {
          owner: {
            select: { id: true, uid: true, displayName: true, avatar: true },
          },
          _count: { select: { members: true } },
        },
      }),
      this.prisma.agency.count(),
    ]);

    return {
      data: data.map((a) => ({ ...a, totalEarnings: Number(a.totalEarnings) })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ==================== JOIN AGENCY ====================

  async joinAgency(userId: string, agencyId: string) {
    const agency = await this.prisma.agency.findUnique({
      where: { id: agencyId },
    });
    if (!agency) throw new NotFoundException('Agency not found');

    // Check if already a member in any agency
    const existingMembership = await this.prisma.agencyMember.findFirst({
      where: { userId },
    });
    if (existingMembership) {
      throw new BadRequestException('You are already a member of an agency');
    }

    const [member] = await this.prisma.$transaction([
      this.prisma.agencyMember.create({
        data: {
          agencyId,
          userId,
          role: AgencyMemberRole.MEMBER,
        },
        include: {
          user: {
            select: { id: true, uid: true, displayName: true, avatar: true },
          },
          agency: { select: { id: true, name: true, logo: true } },
        },
      }),
      this.prisma.agency.update({
        where: { id: agencyId },
        data: { memberCount: { increment: 1 } },
      }),
    ]);

    return member;
  }

  // ==================== LEAVE AGENCY ====================

  async leaveAgency(userId: string, agencyId: string) {
    const membership = await this.prisma.agencyMember.findFirst({
      where: { agencyId, userId },
    });
    if (!membership)
      throw new NotFoundException('You are not a member of this agency');
    if (membership.role === AgencyMemberRole.OWNER) {
      throw new BadRequestException(
        'Agency owner cannot leave. Transfer ownership or dissolve the agency.',
      );
    }

    await this.prisma.$transaction([
      this.prisma.agencyMember.delete({ where: { id: membership.id } }),
      this.prisma.agency.update({
        where: { id: agencyId },
        data: { memberCount: { decrement: 1 } },
      }),
    ]);

    return { message: 'Successfully left the agency' };
  }

  // ==================== AGENCY STATS ====================

  async getAgencyStats(agencyId: string) {
    const agency = await this.prisma.agency.findUnique({
      where: { id: agencyId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                uid: true,
                displayName: true,
                avatar: true,
                wallet: { select: { totalEarned: true, diamonds: true } },
              },
            },
          },
          orderBy: { totalEarnings: 'desc' },
        },
      },
    });

    if (!agency) throw new NotFoundException('Agency not found');

    const topEarners = agency.members.slice(0, 10).map((m) => ({
      userId: m.userId,
      user: m.user,
      totalEarnings: Number(m.totalEarnings),
      commission: m.commission,
      role: m.role,
    }));

    return {
      agencyId,
      name: agency.name,
      totalEarnings: Number(agency.totalEarnings),
      memberCount: agency.memberCount,
      level: agency.level,
      commission: agency.commission,
      topEarners,
    };
  }

  // ==================== AGENCY RANKING ====================

  async getAgencyRanking() {
    const agencies = await this.prisma.agency.findMany({
      take: 50,
      orderBy: { totalEarnings: 'desc' },
      include: {
        owner: {
          select: { id: true, uid: true, displayName: true, avatar: true },
        },
      },
    });

    return agencies.map((a, index) => ({
      rank: index + 1,
      ...a,
      totalEarnings: Number(a.totalEarnings),
    }));
  }

  // ==================== PROCESS HOST EARNINGS ====================

  async processHostEarnings(agencyId: string) {
    const agency = await this.prisma.agency.findUnique({
      where: { id: agencyId },
      include: { members: true },
    });
    if (!agency) throw new NotFoundException('Agency not found');

    const commissionRate = agency.commission / 100;
    const results: any[] = [];

    for (const member of agency.members) {
      if (member.role === AgencyMemberRole.OWNER) continue;

      const wallet = await this.prisma.wallet.findUnique({
        where: { userId: member.userId },
      });
      if (!wallet || wallet.totalEarned <= BigInt(0)) continue;

      // Calculate commission (10% of member's total earned diamonds)
      const commission = Math.floor(
        Number(wallet.totalEarned) * commissionRate,
      );
      if (commission <= 0) continue;

      // Add commission to agency owner's wallet
      await this.walletService.addDiamonds(
        agency.ownerId,
        commission,
        `Commission from member ${member.userId}`,
        member.userId,
      );

      // Update member's earnings record
      await this.prisma.agencyMember.update({
        where: { id: member.id },
        data: {
          totalEarnings: { increment: BigInt(commission) },
          commission: commissionRate * 100,
        },
      });

      results.push({ memberId: member.userId, commission });
    }

    // Update agency total earnings
    const totalCommission = results.reduce((sum, r) => sum + r.commission, 0);
    if (totalCommission > 0) {
      await this.prisma.agency.update({
        where: { id: agencyId },
        data: { totalEarnings: { increment: BigInt(totalCommission) } },
      });
    }

    return { agencyId, distributedCommissions: results, totalCommission };
  }
}
