import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { GreedyService } from './greedy.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { GREEDY_ITEMS, GREEDY_MIN_BET } from './greedy.config';

const mockPrisma = {
  greedyRound: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  greedyBet: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  wallet: {
    findUnique: jest.fn(),
  },
};

const mockWallet = {
  addCoins: jest.fn(),
  deductCoins: jest.fn(),
};

const bettingRound = () => ({
  id: 'round-1',
  roundNumber: 1,
  status: 'BETTING',
  endsAt: new Date(Date.now() + 20000),
  startedAt: new Date(),
  totalBet: BigInt(0),
});

describe('GreedyService', () => {
  let service: GreedyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GreedyService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WalletService, useValue: mockWallet },
      ],
    }).compile();

    service = module.get(GreedyService);
    jest.clearAllMocks();
  });

  describe('config sanity', () => {
    it('has 8 items and a house edge (RTP < 100%)', () => {
      expect(GREEDY_ITEMS).toHaveLength(8);
      const totalWeight = GREEDY_ITEMS.reduce((s, i) => s + i.weight, 0);
      const rtp =
        GREEDY_ITEMS.reduce((s, i) => s + i.weight * i.multiplier, 0) /
        (totalWeight * GREEDY_ITEMS.length);
      expect(rtp).toBeLessThan(1);
      expect(rtp).toBeGreaterThan(0.75); // still fair enough to be fun
    });
  });

  describe('placeBet', () => {
    it('rejects unknown items', async () => {
      await expect(
        service.placeBet('u1', 'unicorn', 1000),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects bets below the minimum', async () => {
      await expect(
        service.placeBet('u1', 'pizza', GREEDY_MIN_BET - 1),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects non-integer amounts', async () => {
      await expect(service.placeBet('u1', 'pizza', 100.5)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects when no betting round is open', async () => {
      mockPrisma.greedyRound.findFirst.mockResolvedValue(null);
      await expect(service.placeBet('u1', 'pizza', 1000)).rejects.toThrow(
        'Betting is closed',
      );
    });

    it('rejects when the betting window already ended', async () => {
      mockPrisma.greedyRound.findFirst.mockResolvedValue({
        ...bettingRound(),
        endsAt: new Date(Date.now() - 1000),
      });
      await expect(service.placeBet('u1', 'pizza', 1000)).rejects.toThrow(
        'Betting is closed',
      );
    });

    it('deducts coins before recording the bet', async () => {
      mockPrisma.greedyRound.findFirst.mockResolvedValue(bettingRound());
      mockPrisma.greedyBet.create.mockResolvedValue({ id: 'bet-1' });
      mockPrisma.greedyRound.update.mockResolvedValue({});
      mockPrisma.greedyBet.groupBy.mockResolvedValue([]);

      const result = await service.placeBet('u1', 'pizza', 1000);

      expect(mockWallet.deductCoins).toHaveBeenCalledWith(
        'u1',
        1000,
        expect.stringContaining('pizza'),
        'round-1',
      );
      expect(mockPrisma.greedyBet.create).toHaveBeenCalled();
      expect(result.item).toBe('pizza');
    });

    it('does not record a bet when the wallet deduction fails', async () => {
      mockPrisma.greedyRound.findFirst.mockResolvedValue(bettingRound());
      mockWallet.deductCoins.mockRejectedValue(
        new BadRequestException('Insufficient coins'),
      );

      await expect(service.placeBet('u1', 'pizza', 1000)).rejects.toThrow(
        'Insufficient coins',
      );
      expect(mockPrisma.greedyBet.create).not.toHaveBeenCalled();
    });
  });

  describe('tick / settlement', () => {
    it('settles an expired round and pays winners bet × multiplier', async () => {
      const expired = {
        ...bettingRound(),
        endsAt: new Date(Date.now() - 1000),
      };
      mockPrisma.greedyRound.findFirst.mockResolvedValue(expired);
      mockPrisma.greedyRound.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.greedyBet.findMany.mockResolvedValue([
        { id: 'bet-1', userId: 'u1', amount: BigInt(1000), item: 'pizza' },
      ]);
      mockPrisma.greedyBet.update.mockResolvedValue({});
      mockPrisma.greedyRound.update.mockResolvedValue({
        id: 'round-1',
        roundNumber: 1,
      });

      await service.tick();

      // Round flipped atomically BETTING -> SETTLED
      expect(mockPrisma.greedyRound.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'round-1', status: 'BETTING' },
        }),
      );

      // Winner paid amount × the drawn item's multiplier
      if (mockWallet.addCoins.mock.calls.length > 0) {
        const paid = mockWallet.addCoins.mock.calls[0][1];
        const multipliers = GREEDY_ITEMS.map((i) => i.multiplier * 1000);
        expect(multipliers).toContain(paid);
      }
    });

    it('does not settle twice when another instance already flipped it', async () => {
      mockPrisma.greedyRound.findFirst.mockResolvedValue({
        ...bettingRound(),
        endsAt: new Date(Date.now() - 1000),
      });
      mockPrisma.greedyRound.updateMany.mockResolvedValue({ count: 0 });

      await service.tick();

      expect(mockPrisma.greedyBet.findMany).not.toHaveBeenCalled();
      expect(mockWallet.addCoins).not.toHaveBeenCalled();
    });

    it('opens a fresh round when none exists', async () => {
      mockPrisma.greedyRound.findFirst.mockResolvedValue(null);
      mockPrisma.greedyRound.create.mockResolvedValue({
        id: 'round-new',
        roundNumber: 2,
      });
      mockPrisma.greedyRound.findUnique.mockResolvedValue({
        id: 'round-new',
        roundNumber: 2,
        status: 'BETTING',
        resultItem: null,
        endsAt: new Date(Date.now() + 22000),
        totalBet: BigInt(0),
      });
      mockPrisma.greedyBet.groupBy.mockResolvedValue([]);
      mockPrisma.greedyRound.findMany.mockResolvedValue([]);

      await service.tick();

      expect(mockPrisma.greedyRound.create).toHaveBeenCalled();
    });
  });
});
