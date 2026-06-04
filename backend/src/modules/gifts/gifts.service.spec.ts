import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { GiftsService } from './gifts.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { TransactionType } from '@prisma/client';

// ==================== MOCKS ====================

jest.mock('ioredis', () => ({ Redis: jest.fn() }));

// Persistent redis mock instance — resetMocks resets fn return values but not the object ref
const mockRedis = { set: jest.fn(), del: jest.fn() };

import * as ioredis from 'ioredis';

const mockGift = {
  id: 'gift-1',
  name: 'Rose',
  coinPrice: 100,
  diamondPrice: 0,
  category: 'NORMAL',
  isActive: true,
};

const mockSenderWallet = {
  userId: 'sender-1',
  coins: BigInt(500),
  diamonds: BigInt(0),
};
const mockReceiverWallet = {
  userId: 'receiver-1',
  coins: BigInt(0),
  diamonds: BigInt(100),
};

const mockTx = {
  gift: { findUnique: jest.fn() },
  wallet: { findUnique: jest.fn(), update: jest.fn() },
  transaction: { create: jest.fn() },
  giftTransaction: { create: jest.fn() },
  voiceRoom: { update: jest.fn() },
};

const mockPrismaService = {
  gift: { findUnique: jest.fn() },
  $transaction: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    if (key === 'redis.url') return 'redis://localhost:6379';
    return undefined;
  }),
};

// ==================== TESTS ====================

describe('GiftsService', () => {
  let service: GiftsService;

  beforeEach(async () => {
    // Re-apply after resetMocks: true clears all implementations
    (ioredis.Redis as unknown as jest.Mock).mockImplementation(() => mockRedis);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GiftsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<GiftsService>(GiftsService);
  });

  describe('sendGift — idempotency/dedup', () => {
    it('blocks duplicate gift send within 10s window', async () => {
      mockRedis.set.mockResolvedValue(null); // NX lock not acquired

      await expect(
        service.sendGift('sender-1', {
          giftId: 'gift-1',
          receiverId: 'receiver-1',
          roomId: 'room-1',
          quantity: 1,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockRedis.set).toHaveBeenCalledWith(
        'gift:send:sender-1:gift-1:receiver-1:room-1',
        '1',
        'EX',
        10,
        'NX',
      );
    });

    it('releases Redis lock even when gift not found', async () => {
      mockRedis.set.mockResolvedValue('1');
      mockRedis.del.mockResolvedValue(1);
      mockPrismaService.gift.findUnique.mockResolvedValue(null);

      await expect(
        service.sendGift('sender-1', {
          giftId: 'gift-1',
          receiverId: 'receiver-1',
          quantity: 1,
        }),
      ).rejects.toThrow(NotFoundException);

      expect(mockRedis.del).toHaveBeenCalled();
    });

    it('dedup key includes senderId, giftId, receiverId, roomId', async () => {
      mockRedis.set.mockResolvedValue(null);

      try {
        await service.sendGift('u1', {
          giftId: 'g1',
          receiverId: 'r1',
          roomId: 'rm1',
          quantity: 1,
        });
      } catch {
        /* expected */
      }

      expect(mockRedis.set).toHaveBeenCalledWith(
        'gift:send:u1:g1:r1:rm1',
        '1',
        'EX',
        10,
        'NX',
      );
    });

    it('dedup key uses empty string for missing roomId', async () => {
      mockRedis.set.mockResolvedValue(null);

      try {
        await service.sendGift('u1', {
          giftId: 'g1',
          receiverId: 'r1',
          quantity: 1,
        });
      } catch {
        /* expected */
      }

      expect(mockRedis.set).toHaveBeenCalledWith(
        'gift:send:u1:g1:r1:',
        '1',
        'EX',
        10,
        'NX',
      );
    });
  });

  describe('sendGift — balance checks', () => {
    beforeEach(() => {
      mockRedis.set.mockResolvedValue('1');
      mockRedis.del.mockResolvedValue(1);
      mockPrismaService.gift.findUnique.mockResolvedValue(mockGift);
    });

    it('throws BadRequestException when sender has insufficient coins', async () => {
      mockPrismaService.$transaction.mockImplementation(async (fn: any) => {
        mockTx.wallet.findUnique.mockResolvedValue({
          ...mockSenderWallet,
          coins: BigInt(50),
        });
        return fn(mockTx);
      });

      await expect(
        service.sendGift('sender-1', {
          giftId: 'gift-1',
          receiverId: 'receiver-1',
          quantity: 1,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockRedis.del).toHaveBeenCalled();
    });

    it('wallet.update NOT called when balance check fails', async () => {
      mockPrismaService.$transaction.mockImplementation(async (fn: any) => {
        mockTx.wallet.findUnique.mockResolvedValue({
          ...mockSenderWallet,
          coins: BigInt(0),
        });
        mockTx.wallet.update.mockClear();
        try {
          return await fn(mockTx);
        } catch {
          throw new BadRequestException('Insufficient coins');
        }
      });

      try {
        await service.sendGift('sender-1', {
          giftId: 'gift-1',
          receiverId: 'receiver-1',
          quantity: 1,
        });
      } catch {
        /* expected */
      }

      expect(mockTx.wallet.update).not.toHaveBeenCalled();
    });

    it('inactive gift throws NotFoundException', async () => {
      mockPrismaService.gift.findUnique.mockResolvedValue({
        ...mockGift,
        isActive: false,
      });

      await expect(
        service.sendGift('sender-1', {
          giftId: 'gift-1',
          receiverId: 'receiver-1',
          quantity: 1,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('sendGift — lucky multiplier', () => {
    it('computes multiplier from [1,2,5,10] for LUCKY gifts', async () => {
      mockRedis.set.mockResolvedValue('1');
      mockRedis.del.mockResolvedValue(1);
      const luckyGift = { ...mockGift, category: 'LUCKY' };
      mockPrismaService.gift.findUnique.mockResolvedValue(luckyGift);

      const capturedData: any[] = [];
      mockPrismaService.$transaction.mockImplementation(async (fn: any) => {
        mockTx.wallet.findUnique.mockResolvedValue(mockSenderWallet);
        mockTx.wallet.update.mockResolvedValue({});
        mockTx.transaction.create.mockResolvedValue({});
        mockTx.giftTransaction.create.mockImplementation(({ data }: any) => {
          capturedData.push(data);
          return { id: 'gtx-lucky', gift: luckyGift, sender: {}, receiver: {} };
        });
        return fn(mockTx);
      });

      await service.sendGift('sender-1', {
        giftId: 'gift-1',
        receiverId: 'receiver-1',
        quantity: 1,
      });

      expect(capturedData[0].multiplier).toBeGreaterThanOrEqual(1);
      expect([1, 2, 5, 10]).toContain(capturedData[0].multiplier);
    });

    it('NORMAL category gift has multiplier = 1', async () => {
      mockRedis.set.mockResolvedValue('1');
      mockRedis.del.mockResolvedValue(1);
      mockPrismaService.gift.findUnique.mockResolvedValue(mockGift);

      const capturedData: any[] = [];
      mockPrismaService.$transaction.mockImplementation(async (fn: any) => {
        mockTx.wallet.findUnique.mockResolvedValue(mockSenderWallet);
        mockTx.wallet.update.mockResolvedValue({});
        mockTx.transaction.create.mockResolvedValue({});
        mockTx.giftTransaction.create.mockImplementation(({ data }: any) => {
          capturedData.push(data);
          return { id: 'gtx-1', gift: mockGift, sender: {}, receiver: {} };
        });
        return fn(mockTx);
      });

      await service.sendGift('sender-1', {
        giftId: 'gift-1',
        receiverId: 'receiver-1',
        quantity: 1,
      });

      expect(capturedData[0].multiplier).toBe(1);
    });
  });

  describe('sendGift — atomic transaction structure', () => {
    beforeEach(() => {
      mockRedis.set.mockResolvedValue('1');
      mockRedis.del.mockResolvedValue(1);
      mockPrismaService.gift.findUnique.mockResolvedValue(mockGift);
    });

    it('calls prisma.$transaction with { timeout: 15000 }', async () => {
      mockPrismaService.$transaction.mockImplementation(async (fn: any) => {
        mockTx.wallet.findUnique.mockResolvedValue(mockSenderWallet);
        mockTx.wallet.update.mockResolvedValue({});
        mockTx.transaction.create.mockResolvedValue({});
        mockTx.giftTransaction.create.mockResolvedValue({
          id: 'gtx-1',
          gift: mockGift,
          sender: {},
          receiver: {},
        });
        return fn(mockTx);
      });

      await service.sendGift('sender-1', {
        giftId: 'gift-1',
        receiverId: 'receiver-1',
        quantity: 1,
      });

      expect(mockPrismaService.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        { timeout: 15000 },
      );
    });

    it('creates both GIFT_SEND and GIFT_RECEIVE transaction records', async () => {
      const txTypes: string[] = [];

      mockPrismaService.$transaction.mockImplementation(async (fn: any) => {
        mockTx.wallet.findUnique
          .mockResolvedValueOnce(mockSenderWallet)
          .mockResolvedValueOnce(mockReceiverWallet);
        mockTx.wallet.update.mockResolvedValue({});
        mockTx.transaction.create.mockImplementation(({ data }: any) => {
          txTypes.push(data.type);
          return {};
        });
        mockTx.giftTransaction.create.mockResolvedValue({
          id: 'gtx-1',
          gift: mockGift,
          sender: {},
          receiver: {},
        });
        return fn(mockTx);
      });

      await service.sendGift('sender-1', {
        giftId: 'gift-1',
        receiverId: 'receiver-1',
        quantity: 1,
      });

      expect(txTypes).toContain(TransactionType.GIFT_SEND);
      expect(txTypes).toContain(TransactionType.GIFT_RECEIVE);
    });

    it('updates voiceRoom totalGifts when roomId provided', async () => {
      mockPrismaService.$transaction.mockImplementation(async (fn: any) => {
        mockTx.wallet.findUnique.mockResolvedValue(mockSenderWallet);
        mockTx.wallet.update.mockResolvedValue({});
        mockTx.transaction.create.mockResolvedValue({});
        mockTx.giftTransaction.create.mockResolvedValue({
          id: 'gtx-1',
          gift: mockGift,
          sender: {},
          receiver: {},
        });
        mockTx.voiceRoom.update.mockResolvedValue({});
        return fn(mockTx);
      });

      await service.sendGift('sender-1', {
        giftId: 'gift-1',
        receiverId: 'receiver-1',
        roomId: 'room-1',
        quantity: 1,
      });

      expect(mockTx.voiceRoom.update).toHaveBeenCalledWith({
        where: { id: 'room-1' },
        data: { totalGifts: { increment: 100 } },
      });
    });
  });
});
