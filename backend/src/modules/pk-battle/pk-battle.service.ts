import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { BattleStatus } from '@prisma/client';
import dayjs from 'dayjs';

@Injectable()
export class PkBattleService {
  private readonly logger = new Logger(PkBattleService.name);

  constructor(
    private prisma: PrismaService,
    @InjectRedis() private redis: Redis,
    @InjectQueue('pk-battle') private pkBattleQueue: Queue,
  ) {}

  async challengeRoom(
    challengerHostId: string,
    challengerRoomId: string,
    defenderRoomId: string,
  ) {
    const challengerRoom = await this.prisma.voiceRoom.findUnique({
      where: { id: challengerRoomId },
    });

    if (!challengerRoom) throw new NotFoundException('Your room not found');
    if (challengerRoom.hostId !== challengerHostId) {
      throw new ForbiddenException('Only room host can initiate PK battle');
    }

    const defenderRoom = await this.prisma.voiceRoom.findUnique({
      where: { id: defenderRoomId },
    });

    if (!defenderRoom) throw new NotFoundException('Defender room not found');
    if (!defenderRoom.isLive)
      throw new BadRequestException('Defender room is not live');

    const activeBattle = await this.prisma.pkBattle.findFirst({
      where: {
        OR: [
          { room1Id: challengerRoomId, status: BattleStatus.ACTIVE },
          { room2Id: challengerRoomId, status: BattleStatus.ACTIVE },
          { room1Id: defenderRoomId, status: BattleStatus.ACTIVE },
          { room2Id: defenderRoomId, status: BattleStatus.ACTIVE },
        ],
      },
    });

    if (activeBattle) {
      throw new BadRequestException(
        'One of the rooms is already in a PK battle',
      );
    }

    const battle = await this.prisma.pkBattle.create({
      data: {
        room1Id: challengerRoomId,
        room2Id: defenderRoomId,
        status: BattleStatus.PENDING,
        duration: 300,
      },
      include: {
        room1: {
          include: {
            host: {
              select: { id: true, uid: true, displayName: true, avatar: true },
            },
          },
        },
        room2: {
          include: {
            host: {
              select: { id: true, uid: true, displayName: true, avatar: true },
            },
          },
        },
      },
    });

    await this.redis.set(
      `pk_challenge:${defenderRoomId}`,
      JSON.stringify({ battleId: battle.id, challengerRoomId }),
      'EX',
      60,
    );

    return battle;
  }

  async acceptChallenge(defenderHostId: string, battleId: string) {
    const battle = await this.prisma.pkBattle.findUnique({
      where: { id: battleId },
      include: {
        room1: true,
        room2: true,
      },
    });

    if (!battle) throw new NotFoundException('Battle not found');
    if (battle.status !== BattleStatus.PENDING) {
      throw new BadRequestException('Battle is not pending');
    }
    if (battle.room2.hostId !== defenderHostId) {
      throw new ForbiddenException('Only defender host can accept challenge');
    }

    return this.startBattle(battleId);
  }

  async startBattle(battleId: string) {
    const startTime = new Date();
    const duration = 300;
    const endTime = dayjs().add(duration, 'second').toDate();

    const battle = await this.prisma.pkBattle.update({
      where: { id: battleId },
      data: {
        status: BattleStatus.ACTIVE,
        startTime,
        endTime,
      },
    });

    await this.redis.set(
      `pk_battle:${battleId}`,
      JSON.stringify({
        room1Score: 0,
        room2Score: 0,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      }),
      'EX',
      duration + 60,
    );

    // BullMQ delayed job — survives server restarts (stored in Redis)
    await this.pkBattleQueue.add(
      'end-battle',
      { battleId },
      { delay: duration * 1000, jobId: `pk-auto-end:${battleId}`, removeOnComplete: true },
    );

    return battle;
  }

  async updateScore(battleId: string, roomId: string, additionalScore: number) {
    const battle = await this.prisma.pkBattle.findUnique({
      where: { id: battleId },
    });
    if (!battle) throw new NotFoundException('Battle not found');
    if (battle.status !== BattleStatus.ACTIVE) {
      throw new BadRequestException('Battle is not active');
    }

    const isRoom1 = battle.room1Id === roomId;
    const isRoom2 = battle.room2Id === roomId;

    if (!isRoom1 && !isRoom2) {
      throw new BadRequestException('Room is not in this battle');
    }

    const updateData = isRoom1
      ? { room1Score: { increment: BigInt(additionalScore) } }
      : { room2Score: { increment: BigInt(additionalScore) } };

    return this.prisma.pkBattle.update({
      where: { id: battleId },
      data: updateData,
    });
  }

  async endBattle(battleId: string) {
    const battle = await this.prisma.pkBattle.findUnique({
      where: { id: battleId },
    });

    if (!battle || battle.status !== BattleStatus.ACTIVE) {
      return;
    }

    let winnerId: string | null = null;
    if (battle.room1Score > battle.room2Score) {
      winnerId = battle.room1Id;
    } else if (battle.room2Score > battle.room1Score) {
      winnerId = battle.room2Id;
    }

    const updatedBattle = await this.prisma.pkBattle.update({
      where: { id: battleId },
      data: {
        status: BattleStatus.ENDED,
        endTime: new Date(),
        winnerId,
      },
    });

    await this.redis.del(`pk_battle:${battleId}`);
    await this.prisma.voiceRoom.updateMany({
      where: { id: { in: [battle.room1Id, battle.room2Id] } },
      data: { pkBattleId: null },
    });

    this.logger.log(
      `PK Battle ${battleId} ended. Winner: ${winnerId || 'Draw'}`,
    );
    return updatedBattle;
  }

  async getPkHistory(roomId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [battles, total] = await Promise.all([
      this.prisma.pkBattle.findMany({
        where: {
          OR: [{ room1Id: roomId }, { room2Id: roomId }],
          status: BattleStatus.ENDED,
        },
        include: {
          room1: {
            include: {
              host: {
                select: {
                  id: true,
                  uid: true,
                  displayName: true,
                  avatar: true,
                },
              },
            },
          },
          room2: {
            include: {
              host: {
                select: {
                  id: true,
                  uid: true,
                  displayName: true,
                  avatar: true,
                },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.pkBattle.count({
        where: {
          OR: [{ room1Id: roomId }, { room2Id: roomId }],
          status: BattleStatus.ENDED,
        },
      }),
    ]);

    return {
      data: battles,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async getActiveBattle(roomId: string) {
    return this.prisma.pkBattle.findFirst({
      where: {
        OR: [{ room1Id: roomId }, { room2Id: roomId }],
        status: BattleStatus.ACTIVE,
      },
      include: {
        room1: {
          include: {
            host: {
              select: { id: true, uid: true, displayName: true, avatar: true },
            },
          },
        },
        room2: {
          include: {
            host: {
              select: { id: true, uid: true, displayName: true, avatar: true },
            },
          },
        },
      },
    });
  }
}
