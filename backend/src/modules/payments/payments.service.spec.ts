import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { ConfigService } from '@nestjs/config';

// ==================== MOCKS ====================

const mockWallet = { coins: BigInt(5000), diamonds: BigInt(10) };

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
  wallet: {
    findUnique: jest.fn(),
  },
  userFirstRecharge: {
    upsert: jest.fn().mockResolvedValue({}),
  },
  userDailyRechargeProgress: {
    upsert: jest.fn().mockResolvedValue({}),
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

    // Default: wallet exists for balance fetch
    mockPrismaService.wallet.findUnique.mockResolvedValue(mockWallet);
    mockPrismaService.userFirstRecharge.upsert.mockResolvedValue({});
    mockPrismaService.userDailyRechargeProgress.upsert.mockResolvedValue({});

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
    mockPrismaService.transaction.findUnique.mockResolvedValue({ id: 'existing-tx' });

    const result = await service.verifyGooglePlayPurchase('user-1', {
      token: 'already-used-token',
      productId: 'voxo_coins_small',
      packageName: 'com.voxo.app',
    });

    expect(result.success).toBe(true);
    expect(result.alreadyProcessed).toBe(true);

    expect(mockPrismaService.transaction.findUnique).toHaveBeenCalledWith({
      where: { googlePlayToken: 'already-used-token' },
    });
    expect(mockPrismaService.transaction.findFirst).not.toHaveBeenCalled();
  });

  it('returns alreadyProcessed without calling wallet service on duplicate', async () => {
    mockPrismaService.transaction.findUnique.mockResolvedValue({ id: 'existing-tx' });

    await service.verifyGooglePlayPurchase('user-1', {
      token: 'dup-token',
      productId: 'voxo_coins_small',
      packageName: 'com.voxo.app',
    });

    expect(mockWalletService.addCoins).not.toHaveBeenCalled();
    expect(mockWalletService.addDiamonds).not.toHaveBeenCalled();
  });

  it('stores googlePlayToken as top-level field, not inside metadata', async () => {
    mockPrismaService.transaction.findUnique.mockResolvedValue(null);
    mockPrismaService.transaction.create.mockResolvedValue({ id: 'new-tx' });
    mockWalletService.addCoins.mockResolvedValue({});

    await service.verifyGooglePlayPurchase('user-1', {
      token: 'new-unique-token',
      productId: 'voxo_coins_small',
      packageName: 'com.voxo.app',
    });

    const createCall = mockPrismaService.transaction.create.mock.calls[0][0].data;
    expect(createCall.googlePlayToken).toBe('new-unique-token');
    expect(createCall.metadata?.googlePlayToken).toBeUndefined();
    expect(createCall.metadata?.productId).toBe('voxo_coins_small');
    expect(createCall.metadata?.packageName).toBe('com.voxo.app');
  });

  it('credits coins for coin products and returns enriched response', async () => {
    mockPrismaService.transaction.findUnique.mockResolvedValue(null);
    mockPrismaService.transaction.create.mockResolvedValue({ id: 'tx-1' });
    mockWalletService.addCoins.mockResolvedValue({});

    const result = await service.verifyGooglePlayPurchase('user-1', {
      token: 'token-coins',
      productId: 'voxo_coins_small',
      packageName: 'com.voxo.app',
    });

    expect(result.success).toBe(true);
    expect(result.coinsAdded).toBe(100);
    expect(result.diamondsAdded).toBe(0);
    expect(result.newBalance).toBeDefined();

    // addCoins called with (userId, totalCoins, description, txId)
    expect(mockWalletService.addCoins).toHaveBeenCalledWith(
      'user-1',
      100,
      'Google Play: voxo_coins_small',
      'tx-1',
    );
    expect(mockWalletService.addDiamonds).not.toHaveBeenCalled();
  });

  it('credits diamonds for diamond products and returns enriched response', async () => {
    mockPrismaService.transaction.findUnique.mockResolvedValue(null);
    mockPrismaService.transaction.create.mockResolvedValue({ id: 'tx-2' });
    mockWalletService.addDiamonds.mockResolvedValue({});

    const result = await service.verifyGooglePlayPurchase('user-1', {
      token: 'token-diamonds',
      productId: 'voxo_diamonds_medium',
      packageName: 'com.voxo.app',
    });

    expect(result.success).toBe(true);
    expect(result.diamondsAdded).toBe(200);
    expect(result.coinsAdded).toBe(0);
    expect(result.newBalance).toBeDefined();

    expect(mockWalletService.addDiamonds).toHaveBeenCalledWith(
      'user-1',
      200,
      'Google Play: voxo_diamonds_medium',
      'tx-2',
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
