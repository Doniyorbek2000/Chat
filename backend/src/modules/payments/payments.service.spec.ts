import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { ConfigService } from '@nestjs/config';
import { TransactionStatus } from '@prisma/client';

// ==================== MOCKS ====================

const mockPrismaService = {
  transaction: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

const mockWalletService = {
  addCoins: jest.fn(),
  addDiamonds: jest.fn(),
  processRecharge: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    const cfg: Record<string, string> = {
      'click.serviceId': '12345',
      'click.merchantId': '67890',
      'click.secretKey': 'test-secret',
      'payme.key': 'payme-key',
      'app.env': 'development', // isDev = true
    };
    return cfg[key];
  }),
};

// ==================== TESTS ====================

describe('PaymentsService — Google Play dedup', () => {
  let service: PaymentsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WalletService, useValue: mockWalletService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it('uses findUnique (not findFirst) for duplicate token check', async () => {
    // Simulate token already exists
    mockPrismaService.transaction.findUnique.mockResolvedValue({
      id: 'existing-tx',
    });

    const result = await service.verifyGooglePlayPurchase('user-1', {
      token: 'already-used-token',
      productId: 'voxo_coins_small',
      packageName: 'com.voxo.app',
    });

    expect(result).toEqual({ success: true, alreadyProcessed: true });

    // Must use findUnique with googlePlayToken field — NOT findFirst with metadata path
    expect(mockPrismaService.transaction.findUnique).toHaveBeenCalledWith({
      where: { googlePlayToken: 'already-used-token' },
    });
    expect(mockPrismaService.transaction.findFirst).not.toHaveBeenCalled();
  });

  it('returns alreadyProcessed without calling wallet service on duplicate', async () => {
    mockPrismaService.transaction.findUnique.mockResolvedValue({
      id: 'existing-tx',
    });

    await service.verifyGooglePlayPurchase('user-1', {
      token: 'dup-token',
      productId: 'voxo_coins_small',
      packageName: 'com.voxo.app',
    });

    expect(mockWalletService.addCoins).not.toHaveBeenCalled();
    expect(mockWalletService.addDiamonds).not.toHaveBeenCalled();
  });

  it('stores googlePlayToken as top-level field, not inside metadata', async () => {
    mockPrismaService.transaction.findUnique.mockResolvedValue(null); // not a duplicate
    mockPrismaService.transaction.create.mockResolvedValue({ id: 'new-tx' });
    mockWalletService.addCoins.mockResolvedValue({});

    await service.verifyGooglePlayPurchase('user-1', {
      token: 'new-unique-token',
      productId: 'voxo_coins_small',
      packageName: 'com.voxo.app',
    });

    const createCall =
      mockPrismaService.transaction.create.mock.calls[0][0].data;

    // googlePlayToken must be a top-level field
    expect(createCall.googlePlayToken).toBe('new-unique-token');

    // token must NOT be inside metadata (it's in the DB field now)
    expect(createCall.metadata?.googlePlayToken).toBeUndefined();

    // other metadata still present
    expect(createCall.metadata?.productId).toBe('voxo_coins_small');
    expect(createCall.metadata?.packageName).toBe('com.voxo.app');
  });

  it('credits coins for coin products', async () => {
    mockPrismaService.transaction.findUnique.mockResolvedValue(null);
    mockPrismaService.transaction.create.mockResolvedValue({ id: 'tx-1' });
    mockWalletService.addCoins.mockResolvedValue({});

    const result = await service.verifyGooglePlayPurchase('user-1', {
      token: 'token-coins',
      productId: 'voxo_coins_small',
      packageName: 'com.voxo.app',
    });

    expect(result).toEqual({ success: true, reward: { coins: 100 } });
    expect(mockWalletService.addCoins).toHaveBeenCalledWith(
      'user-1',
      100,
      'Google Play: voxo_coins_small',
    );
    expect(mockWalletService.addDiamonds).not.toHaveBeenCalled();
  });

  it('credits diamonds for diamond products', async () => {
    mockPrismaService.transaction.findUnique.mockResolvedValue(null);
    mockPrismaService.transaction.create.mockResolvedValue({ id: 'tx-2' });
    mockWalletService.addDiamonds.mockResolvedValue({});

    const result = await service.verifyGooglePlayPurchase('user-1', {
      token: 'token-diamonds',
      productId: 'voxo_diamonds_medium',
      packageName: 'com.voxo.app',
    });

    expect(result).toEqual({ success: true, reward: { diamonds: 200 } });
    expect(mockWalletService.addDiamonds).toHaveBeenCalledWith(
      'user-1',
      200,
      'Google Play: voxo_diamonds_medium',
    );
  });

  it('throws for unknown product ID', async () => {
    mockPrismaService.transaction.findUnique.mockResolvedValue(null);

    await expect(
      service.verifyGooglePlayPurchase('user-1', {
        token: 'token-unknown',
        productId: 'unknown_product_xyz',
        packageName: 'com.voxo.app',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws in production env (not dev mode)', async () => {
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'app.env') return 'production';
      return undefined;
    });

    await expect(
      service.verifyGooglePlayPurchase('user-1', {
        token: 'any-token',
        productId: 'voxo_coins_small',
        packageName: 'com.voxo.app',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
