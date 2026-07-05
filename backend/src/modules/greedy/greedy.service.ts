import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { GreedyRoundStatus } from '@prisma/client';
import {
  GREEDY_ITEMS,
  GREEDY_TOTAL_WEIGHT,
  GREEDY_BETTING_SECONDS,
  GREEDY_REVEAL_SECONDS,
  GREEDY_MIN_BET,
  GREEDY_MAX_BET,
} from './greedy.config';

type Broadcaster = (event: string, payload: unknown) => void;

/**
 * Greedy — the classic live-room wheel betting game.
 *
 * A round loop runs continuously: 22s of betting, then a weighted random
 * result is drawn server-side (crypto RNG), winners are paid
 * bet × multiplier, and after an 8s reveal window the next round opens.
 * The loop is driven by a Bull tick job (see GreedyProcessor), so it
 * survives restarts and runs exactly once across instances.
 */
@Injectable()
export class GreedyService {
  private readonly logger = new Logger(GreedyService.name);
  private broadcaster: Broadcaster = () => undefined;

  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
  ) {}

  /** Called by the gateway so settlements can be pushed to clients. */
  registerBroadcaster(broadcaster: Broadcaster): void {
    this.broadcaster = broadcaster;
  }

  getItems() {
    return GREEDY_ITEMS.map(({ key, multiplier }) => ({ key, multiplier }));
  }

  /**
   * Advance the round state machine. Invoked every few seconds by the
   * Bull processor; also safe to call ad hoc (idempotent).
   */
  async tick(): Promise<void> {
    const round = await this.prisma.greedyRound.findFirst({
      orderBy: { roundNumber: 'desc' },
    });

    const now = Date.now();

    if (!round) {
      await this.openRound();
      return;
    }

    if (round.status === GreedyRoundStatus.BETTING) {
      if (now >= round.endsAt.getTime()) {
        await this.settleRound(round.id);
      }
      return;
    }

    // SETTLED — open the next round once the reveal window has passed
    const revealOver =
      round.settledAt &&
      now >= round.settledAt.getTime() + GREEDY_REVEAL_SECONDS * 1000;
    if (revealOver) {
      await this.openRound();
    }
  }

  private async openRound() {
    const round = await this.prisma.greedyRound.create({
      data: {
        endsAt: new Date(Date.now() + GREEDY_BETTING_SECONDS * 1000),
      },
    });
    this.logger.log(`Greedy round #${round.roundNumber} open`);
    this.broadcaster('greedy:state', await this.buildPublicState(round.id));
    return round;
  }

  private drawResult(): string {
    // Unbiased weighted draw using crypto randomness
    const roll = crypto.randomInt(0, GREEDY_TOTAL_WEIGHT);
    let cumulative = 0;
    for (const item of GREEDY_ITEMS) {
      cumulative += item.weight;
      if (roll < cumulative) return item.key;
    }
    return GREEDY_ITEMS[0].key;
  }

  private async settleRound(roundId: string): Promise<void> {
    const resultItem = this.drawResult();

    // Atomic status flip — only one concurrent settle can win
    const flipped = await this.prisma.greedyRound.updateMany({
      where: { id: roundId, status: GreedyRoundStatus.BETTING },
      data: {
        status: GreedyRoundStatus.SETTLED,
        resultItem,
        settledAt: new Date(),
      },
    });
    if (flipped.count === 0) return;

    const multiplier =
      GREEDY_ITEMS.find((i) => i.key === resultItem)?.multiplier ?? 0;

    const winningBets = await this.prisma.greedyBet.findMany({
      where: { roundId, item: resultItem },
    });

    let totalPayout = BigInt(0);
    for (const bet of winningBets) {
      const payout = bet.amount * BigInt(multiplier);
      totalPayout += payout;
      await this.prisma.greedyBet.update({
        where: { id: bet.id },
        data: { payout },
      });
      try {
        await this.walletService.addCoins(
          bet.userId,
          Number(payout),
          `Greedy win: ${resultItem} x${multiplier}`,
          bet.id,
        );
      } catch (error) {
        this.logger.error(
          `Greedy payout failed: bet=${bet.id} user=${bet.userId} ${error.message}`,
        );
      }
    }

    const round = await this.prisma.greedyRound.update({
      where: { id: roundId },
      data: { totalPayout },
    });

    this.logger.log(
      `Greedy round #${round.roundNumber} settled: ${resultItem} x${multiplier}, ` +
        `${winningBets.length} winners, payout=${totalPayout}`,
    );

    this.broadcaster('greedy:result', {
      roundId: round.id,
      roundNumber: round.roundNumber,
      resultItem,
      multiplier,
      winners: winningBets.length,
      totalPayout: Number(totalPayout),
      revealSeconds: GREEDY_REVEAL_SECONDS,
    });
  }

  async placeBet(userId: string, itemKey: string, amount: number) {
    const item = GREEDY_ITEMS.find((i) => i.key === itemKey);
    if (!item) throw new BadRequestException('Unknown item');
    if (
      !Number.isInteger(amount) ||
      amount < GREEDY_MIN_BET ||
      amount > GREEDY_MAX_BET
    ) {
      throw new BadRequestException(
        `Bet must be between ${GREEDY_MIN_BET} and ${GREEDY_MAX_BET} coins`,
      );
    }

    const round = await this.prisma.greedyRound.findFirst({
      where: { status: GreedyRoundStatus.BETTING },
      orderBy: { roundNumber: 'desc' },
    });
    if (!round || Date.now() >= round.endsAt.getTime()) {
      throw new BadRequestException('Betting is closed — wait for the next round');
    }

    // Deduct first (throws on insufficient balance), then record the bet
    await this.walletService.deductCoins(
      userId,
      amount,
      `Greedy bet: ${itemKey}`,
      round.id,
    );

    const bet = await this.prisma.greedyBet.create({
      data: {
        roundId: round.id,
        userId,
        item: itemKey,
        amount: BigInt(amount),
      },
    });

    await this.prisma.greedyRound.update({
      where: { id: round.id },
      data: { totalBet: { increment: amount } },
    });

    this.broadcaster('greedy:bets', await this.aggregateBets(round.id));

    return {
      betId: bet.id,
      roundId: round.id,
      item: itemKey,
      amount,
    };
  }

  /** Current round state for a specific viewer. */
  async getState(userId?: string) {
    let round = await this.prisma.greedyRound.findFirst({
      orderBy: { roundNumber: 'desc' },
    });
    // First call ever (or stalled loop) — open a round on demand
    if (!round) {
      round = await this.openRound();
    }

    const state = await this.buildPublicState(round.id);

    let myBets: { item: string; amount: number; payout: number }[] = [];
    let myCoins = 0;
    if (userId) {
      const [bets, wallet] = await Promise.all([
        this.prisma.greedyBet.findMany({
          where: { roundId: round.id, userId },
        }),
        this.prisma.wallet.findUnique({ where: { userId } }),
      ]);
      myBets = bets.map((b) => ({
        item: b.item,
        amount: Number(b.amount),
        payout: Number(b.payout),
      }));
      myCoins = Number(wallet?.coins ?? 0);
    }

    return { ...state, myBets, myCoins };
  }

  private async buildPublicState(roundId: string) {
    const round = await this.prisma.greedyRound.findUnique({
      where: { id: roundId },
    });

    return {
      roundId: round.id,
      roundNumber: round.roundNumber,
      status: round.status,
      resultItem: round.resultItem,
      endsAt: round.endsAt.toISOString(),
      serverTime: new Date().toISOString(),
      totalBet: Number(round.totalBet),
      items: this.getItems(),
      bets: await this.aggregateBets(roundId),
      lastResults: await this.getLastResults(12),
    };
  }

  private async aggregateBets(roundId: string) {
    const grouped = await this.prisma.greedyBet.groupBy({
      by: ['item'],
      where: { roundId },
      _sum: { amount: true },
      _count: true,
    });
    return grouped.map((g) => ({
      item: g.item,
      total: Number(g._sum.amount ?? 0),
      players: g._count,
    }));
  }

  async getLastResults(limit = 12) {
    const rounds = await this.prisma.greedyRound.findMany({
      where: { status: GreedyRoundStatus.SETTLED },
      orderBy: { roundNumber: 'desc' },
      take: limit,
      select: { roundNumber: true, resultItem: true },
    });
    return rounds.map((r) => ({
      roundNumber: r.roundNumber,
      item: r.resultItem,
    }));
  }

  async getMyHistory(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.greedyBet.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          round: { select: { roundNumber: true, resultItem: true } },
        },
      }),
      this.prisma.greedyBet.count({ where: { userId } }),
    ]);

    return {
      items: items.map((b) => ({
        roundNumber: b.round.roundNumber,
        resultItem: b.round.resultItem,
        item: b.item,
        amount: Number(b.amount),
        payout: Number(b.payout),
        won: b.payout > BigInt(0),
        createdAt: b.createdAt,
      })),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }
}
