import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

// ==================== MOCKS ====================

jest.mock('ioredis', () => ({ Redis: jest.fn() }));
import * as ioredis from 'ioredis';

// Persistent mock instance — resetMocks resets return values, not the object reference
const mockRedis = { set: jest.fn(), del: jest.fn() };

const mockPrismaService = {
  wallet: { findUnique: jest.fn(), update: jest.fn() },
  transaction: { findMany: jest.fn(), count: jest.fn(), create: jest.fn() },
  $transaction: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    if (key === 'redis.url') return 'redis://localhost:6379';
    return undefined;
  }),
};

// ==================== TESTS ====================

describe('WalletService — addDiamonds Redis lock', () => {
  let service: WalletService;

  beforeEach(async () => {
    // Re-apply after resetMocks: true clears all implementations
    (ioredis.Redis as unknown as jest.Mock).mockImplementation(() => mockRedis);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
  });

  it('acquires Redis NX lock before addDiamonds with correct key', async () => {
    mockRedis.set.mockResolvedValue('1');
    mockRedis.del.mockResolvedValue(1);
    mockPrismaService.wallet.findUnique.mockResolvedValue({
      userId: 'u1',
      diamonds: BigInt(0),
    });
    mockPrismaService.$transaction.mockResolvedValue([
      { userId: 'u1', diamonds: BigInt(100) },
      {},
    ]);

    await service.addDiamonds('u1', 100, 'test gift');

    expect(mockRedis.set).toHaveBeenCalledWith(
      'wallet:diamonds:add:u1',
      '1',
      'EX',
      5,
      'NX',
    );
  });

  it('throws BadRequestException when Redis lock is already held', async () => {
    mockRedis.set.mockResolvedValue(null); // NX — lock not acquired

    await expect(service.addDiamonds('u1', 100, 'test')).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.addDiamonds('u1', 100, 'test')).rejects.toThrow(
      'Wallet operation in progress',
    );
  });

  it('does NOT call wallet.update when lock is not acquired', async () => {
    mockRedis.set.mockResolvedValue(null);

    try {
      await service.addDiamonds('u1', 100, 'test');
    } catch {
      /* expected */
    }

    expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
  });

  it('releases lock in finally block on success', async () => {
    mockRedis.set.mockResolvedValue('1');
    mockRedis.del.mockResolvedValue(1);
    mockPrismaService.wallet.findUnique.mockResolvedValue({
      userId: 'u1',
      diamonds: BigInt(0),
    });
    mockPrismaService.$transaction.mockResolvedValue([
      { userId: 'u1', diamonds: BigInt(50) },
      {},
    ]);

    await service.addDiamonds('u1', 50, 'test');

    expect(mockRedis.del).toHaveBeenCalledWith('wallet:diamonds:add:u1');
  });

  it('releases lock in finally block even when prisma throws', async () => {
    mockRedis.set.mockResolvedValue('1');
    mockRedis.del.mockResolvedValue(1);
    mockPrismaService.wallet.findUnique.mockResolvedValue({
      userId: 'u1',
      diamonds: BigInt(0),
    });
    mockPrismaService.$transaction.mockRejectedValue(
      new Error('DB connection lost'),
    );

    await expect(service.addDiamonds('u1', 50, 'test')).rejects.toThrow(
      'DB connection lost',
    );

    expect(mockRedis.del).toHaveBeenCalledWith('wallet:diamonds:add:u1');
  });

  it('proceeds normally when lock is available', async () => {
    mockRedis.set.mockResolvedValue('1');
    mockRedis.del.mockResolvedValue(1);
    const updatedWallet = { userId: 'u1', diamonds: BigInt(150) };
    mockPrismaService.wallet.findUnique.mockResolvedValue({
      userId: 'u1',
      diamonds: BigInt(50),
    });
    mockPrismaService.$transaction.mockResolvedValue([updatedWallet, {}]);

    const result = await service.addDiamonds('u1', 100, 'gift received');

    expect(result).toEqual(updatedWallet);
  });

  describe('addCoins — regression (existing lock pattern preserved)', () => {
    it('addCoins proceeds when lock is available', async () => {
      mockRedis.set.mockResolvedValue('1');
      mockRedis.del.mockResolvedValue(1);
      const updated = { userId: 'u1', coins: BigInt(200) };
      mockPrismaService.wallet.findUnique.mockResolvedValue({
        userId: 'u1',
        coins: BigInt(100),
      });
      mockPrismaService.$transaction.mockResolvedValue([updated, {}]);

      const result = await service.addCoins('u1', 100, 'reward');

      expect(result).toEqual(updated);
      expect(mockRedis.set).toHaveBeenCalledWith(
        'wallet_lock:u1',
        '1',
        'EX',
        5,
        'NX',
      );
    });
  });

  describe('deductCoins — regression', () => {
    it('throws when coins insufficient', async () => {
      mockRedis.set.mockResolvedValue('1');
      mockRedis.del.mockResolvedValue(1);
      mockPrismaService.wallet.findUnique.mockResolvedValue({
        userId: 'u1',
        coins: BigInt(10),
      });

      await expect(service.deductCoins('u1', 100, 'test')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
