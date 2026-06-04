import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import {
  InitiatePaymentDto,
  ClickPrepareDto,
  ClickCompleteDto,
  PaymeDto,
  PaymentProvider,
} from './dto/payments.dto';
import { TransactionType, Currency, TransactionStatus } from '@prisma/client';

const COIN_PACKAGES: Record<string, { coins: number; bonus: number; amount: number }> = {
  // Legacy IDs (kept for backward compat)
  pkg_100: { coins: 100, bonus: 0, amount: 999 },
  pkg_500: { coins: 500, bonus: 0, amount: 4490 },
  pkg_1000: { coins: 1000, bonus: 0, amount: 7990 },
  pkg_5000: { coins: 5000, bonus: 0, amount: 34990 },
  pkg_10000: { coins: 10000, bonus: 0, amount: 59990 },
  pkg_50000: { coins: 50000, bonus: 0, amount: 249990 },
  // Current product IDs matching DB RechargeProduct
  voxo_coin_1000000: { coins: 1000000, bonus: 500000, amount: 9900 },
  voxo_coin_5000000: { coins: 5000000, bonus: 1000000, amount: 44900 },
  voxo_coin_10000000: { coins: 10000000, bonus: 1500000, amount: 79900 },
  // First recharge offers
  voxo_first_recharge_099: { coins: 100000, bonus: 50000, amount: 990 },
  voxo_first_recharge_499: { coins: 500000, bonus: 250000, amount: 4900 },
  voxo_first_recharge_999: { coins: 1000000, bonus: 1000000, amount: 9900 },
};

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
    private config: ConfigService,
  ) {}

  async initiatePayment(userId: string, dto: InitiatePaymentDto) {
    const pkg = COIN_PACKAGES[dto.packageId];
    if (!pkg) throw new BadRequestException('Invalid package');

    const transaction = await this.prisma.transaction.create({
      data: {
        userId,
        type: TransactionType.RECHARGE,
        currency: Currency.COINS,
        amount: BigInt(pkg.coins),
        balanceBefore: BigInt(0),
        balanceAfter: BigInt(0),
        status: TransactionStatus.PENDING,
        description: `Recharge ${pkg.coins} coins via ${dto.provider}`,
        metadata: {
          provider: dto.provider,
          packageId: dto.packageId,
          amount: dto.amount,
        },
      },
    });

    let paymentUrl: string;
    const serviceId = this.config.get<string>('click.serviceId') || '12345';
    const merchantId = this.config.get<string>('click.merchantId') || '67890';
    const paymeKey = this.config.get<string>('payme.key') || 'paymekey';

    if (dto.provider === PaymentProvider.CLICK) {
      paymentUrl = `https://my.click.uz/services/pay?service_id=${serviceId}&merchant_id=${merchantId}&amount=${dto.amount}&transaction_param=${transaction.id}&return_url=voxo://payment`;
    } else if (dto.provider === PaymentProvider.PAYME) {
      const params = `m=${paymeKey};ac.order_id=${transaction.id};a=${dto.amount * 100}`;
      const encoded = Buffer.from(params).toString('base64');
      paymentUrl = `https://checkout.paycom.uz/${encoded}`;
    } else {
      paymentUrl = `voxo://payment?status=pending&transaction=${transaction.id}`;
    }

    return { transactionId: transaction.id, paymentUrl };
  }

  async handleClickPrepare(dto: ClickPrepareDto) {
    const secretKey = this.config.get<string>('click.secretKey') || 'secret';
    const expectedSign = crypto
      .createHash('md5')
      .update(
        `${dto.click_trans_id}${dto.service_id}${secretKey}${dto.merchant_trans_id}${dto.amount}${dto.action}${dto.sign_time}`,
      )
      .digest('hex');

    if (dto.sign_string !== expectedSign) {
      return { error: -1, error_note: 'SIGN CHECK FAILED!' };
    }

    const transaction = await this.prisma.transaction.findUnique({
      where: { id: dto.merchant_trans_id },
    });

    if (!transaction) return { error: -5, error_note: 'Order not found' };
    if (transaction.status !== TransactionStatus.PENDING)
      return { error: -4, error_note: 'Already paid' };

    return {
      error: 0,
      error_note: 'Success',
      click_trans_id: dto.click_trans_id,
      merchant_trans_id: dto.merchant_trans_id,
      merchant_prepare_id: transaction.id,
    };
  }

  async handleClickComplete(dto: ClickCompleteDto) {
    const secretKey = this.config.get<string>('click.secretKey') || 'secret';
    const expectedSign = crypto
      .createHash('md5')
      .update(
        `${dto.click_trans_id}${dto.service_id}${secretKey}${dto.merchant_trans_id}${dto.merchant_prepare_id}${dto.amount}${dto.action}${dto.sign_time}`,
      )
      .digest('hex');

    if (dto.sign_string !== expectedSign) {
      return { error: -1, error_note: 'SIGN CHECK FAILED!' };
    }

    if (dto.error < 0) {
      await this.prisma.transaction.update({
        where: { id: dto.merchant_trans_id },
        data: { status: TransactionStatus.FAILED },
      });
      return { error: 0, error_note: 'Transaction cancelled' };
    }

    const transaction = await this.prisma.transaction.findUnique({
      where: { id: dto.merchant_trans_id },
    });
    if (!transaction || transaction.status !== TransactionStatus.PENDING) {
      return {
        error: -4,
        error_note: 'Transaction not found or already processed',
      };
    }

    await this._completePurchase(transaction.id, transaction.userId);
    return {
      error: 0,
      error_note: 'Success',
      click_trans_id: dto.click_trans_id,
      merchant_trans_id: dto.merchant_trans_id,
    };
  }

  async handlePayme(dto: PaymeDto) {
    const id = dto.id || 1;

    switch (dto.method) {
      case 'CheckPerformTransaction': {
        const transaction = await this.prisma.transaction.findUnique({
          where: { id: dto.params?.account?.order_id },
        });
        if (!transaction)
          return {
            error: { code: -31050, message: { en: 'Order not found' } },
            id,
          };
        return { result: { allow: true }, id };
      }

      case 'CreateTransaction': {
        const transaction = await this.prisma.transaction.findUnique({
          where: { id: dto.params?.account?.order_id },
        });
        if (!transaction)
          return {
            error: { code: -31050, message: { en: 'Order not found' } },
            id,
          };
        return {
          result: {
            create_time: Date.now(),
            transaction: transaction.id,
            state: 1,
          },
          id,
        };
      }

      case 'PerformTransaction': {
        const transactionId = dto.params?.id;
        const transaction = await this.prisma.transaction.findFirst({
          where: {
            metadata: { path: ['paymeTransId'], equals: transactionId },
          },
        });
        if (!transaction)
          return {
            error: { code: -31003, message: { en: 'Transaction not found' } },
            id,
          };

        await this._completePurchase(transaction.id, transaction.userId);
        return {
          result: {
            transaction: transaction.id,
            perform_time: Date.now(),
            state: 2,
          },
          id,
        };
      }

      case 'CancelTransaction': {
        const transactionId = dto.params?.id;
        await this.prisma.transaction.updateMany({
          where: {
            metadata: { path: ['paymeTransId'], equals: transactionId },
          },
          data: { status: TransactionStatus.FAILED },
        });
        return {
          result: {
            transaction: transactionId,
            cancel_time: Date.now(),
            state: -1,
          },
          id,
        };
      }

      default:
        return {
          error: { code: -32601, message: { en: 'Method not found' } },
          id,
        };
    }
  }

  async verifyGooglePlayPurchase(
    userId: string,
    dto: { token: string; productId: string; packageName: string },
  ) {
    const { token, productId, packageName } = dto;

    const isDev = this.config.get<string>('app.env') !== 'production';
    const mockVerifyEnabled = this.config.get<string>('GOOGLE_PLAY_MOCK_VERIFY') === 'true';

    if (!isDev && !mockVerifyEnabled) {
      // Production: verify via Google Play Developer API
      // Placeholder — wire up googleapis when service account JSON is configured
      this.logger.warn(`[GooglePlay] Production verify not configured. productId=${productId}`);
      throw new BadRequestException(
        'Google Play verification not configured in production',
      );
    }

    // Idempotency: reject duplicate tokens
    const existing = await this.prisma.transaction.findUnique({
      where: { googlePlayToken: token },
    });
    if (existing) {
      const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
      return {
        success: true,
        alreadyProcessed: true,
        transactionId: existing.id,
        newBalance: { coins: wallet?.coins ?? 0, diamonds: wallet?.diamonds ?? 0 },
      };
    }

    // Map product ID → reward  (coins/bonus/diamonds)
    const productRewards: Record<
      string,
      { coins?: number; bonus?: number; diamonds?: number }
    > = {
      voxo_coin_1000000: { coins: 1000000, bonus: 500000 },
      voxo_coin_5000000: { coins: 5000000, bonus: 1000000 },
      voxo_coin_10000000: { coins: 10000000, bonus: 1500000 },
      voxo_diamond_100: { diamonds: 100 },
      voxo_diamond_500: { diamonds: 500 },
      voxo_diamond_1000: { diamonds: 1000 },
      voxo_first_recharge_099: { coins: 100000, bonus: 50000 },
      voxo_first_recharge_499: { coins: 500000, bonus: 250000 },
      voxo_first_recharge_999: { coins: 1000000, bonus: 1000000 },
      // Legacy IDs
      voxo_coins_small: { coins: 100 },
      voxo_coins_medium: { coins: 500 },
      voxo_coins_large: { coins: 1000 },
      voxo_diamonds_small: { diamonds: 50 },
      voxo_diamonds_medium: { diamonds: 200 },
      voxo_diamonds_large: { diamonds: 500 },
    };

    const reward = productRewards[productId];
    if (!reward) throw new BadRequestException(`Unknown product: ${productId}`);

    // Create transaction record (googlePlayToken is @unique — prevents double processing)
    const tx = await this.prisma.transaction.create({
      data: {
        userId,
        type: TransactionType.RECHARGE,
        currency: reward.diamonds ? Currency.DIAMONDS : Currency.COINS,
        amount: BigInt((reward.coins ?? 0) + (reward.bonus ?? 0) + (reward.diamonds ?? 0)),
        balanceBefore: BigInt(0),
        balanceAfter: BigInt(0),
        status: TransactionStatus.COMPLETED,
        description: `Google Play: ${productId}`,
        googlePlayToken: token,
        metadata: { productId, packageName, bonus: reward.bonus ?? 0 },
      },
    });

    const totalCoins = (reward.coins ?? 0) + (reward.bonus ?? 0);
    if (reward.coins) {
      await this.walletService.addCoins(userId, totalCoins, `Google Play: ${productId}`, tx.id);
    }
    if (reward.diamonds) {
      await this.walletService.addDiamonds(userId, reward.diamonds, `Google Play: ${productId}`, tx.id);
    }

    // Mark first recharge if applicable
    const isFirstRecharge = productId.startsWith('voxo_first_recharge');
    if (isFirstRecharge) {
      await this.prisma.userFirstRecharge.upsert({
        where: { userId },
        update: {},
        create: {
          userId,
          productId,
          coinsGranted: BigInt(reward.coins ?? 0),
          bonusGranted: BigInt(reward.bonus ?? 0),
        },
      }).catch(() => null); // Ignore if already exists
    }

    // Update daily recharge progress
    if (totalCoins > 0) {
      const date = new Date().toISOString().slice(0, 10);
      await this.prisma.userDailyRechargeProgress.upsert({
        where: { userId_date: { userId, date } },
        update: { totalCoins: { increment: totalCoins } },
        create: { userId, date, totalCoins: BigInt(totalCoins), claimedTiers: [] },
      }).catch(() => null);
    }

    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });

    return {
      success: true,
      transactionId: tx.id,
      coinsAdded: reward.coins ?? 0,
      bonusAdded: reward.bonus ?? 0,
      diamondsAdded: reward.diamonds ?? 0,
      newBalance: {
        coins: wallet?.coins ?? 0,
        diamonds: wallet?.diamonds ?? 0,
      },
    };
  }

  async getTransactionHistory(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { userId, type: TransactionType.RECHARGE },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.transaction.count({
        where: { userId, type: TransactionType.RECHARGE },
      }),
    ]);
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  private async _completePurchase(transactionId: string, userId: string) {
    // Atomic status flip — only one concurrent call can succeed (PENDING → COMPLETED)
    const updated = await this.prisma.transaction.updateMany({
      where: { id: transactionId, status: TransactionStatus.PENDING },
      data: { status: TransactionStatus.COMPLETED },
    });

    // If count === 0, another request already processed it — idempotent early return
    if (updated.count === 0) return;

    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });
    if (!transaction) return;

    const meta = transaction.metadata as any;
    const pkg = COIN_PACKAGES[meta?.packageId];
    if (!pkg) return;

    await this.walletService.processRecharge(
      userId,
      meta?.amount || 0,
      pkg.coins,
      transactionId,
      pkg.bonus ?? 0,
    );

    // Update daily recharge progress for Click/Payme purchases too
    if (pkg.coins > 0) {
      const date = new Date().toISOString().slice(0, 10);
      const totalCoins = pkg.coins + (pkg.bonus ?? 0);
      await this.prisma.userDailyRechargeProgress.upsert({
        where: { userId_date: { userId, date } },
        update: { totalCoins: { increment: totalCoins } },
        create: { userId, date, totalCoins: BigInt(totalCoins), claimedTiers: [] },
      }).catch(() => null);
    }
  }
}
