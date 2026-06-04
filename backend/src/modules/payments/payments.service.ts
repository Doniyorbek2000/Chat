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

const COIN_PACKAGES: Record<string, { coins: number; amount: number }> = {
  pkg_100: { coins: 100, amount: 999 },
  pkg_500: { coins: 500, amount: 4490 },
  pkg_1000: { coins: 1000, amount: 7990 },
  pkg_5000: { coins: 5000, amount: 34990 },
  pkg_10000: { coins: 10000, amount: 59990 },
  pkg_50000: { coins: 50000, amount: 249990 },
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

    // In production: use Google Play Developer API to verify
    // POST https://www.googleapis.com/androidpublisher/v3/applications/{packageName}/purchases/products/{productId}/tokens/{token}
    // For now: dev mode accepts all purchases and credits wallet

    const isDev = this.config.get<string>('app.env') !== 'production';

    if (!isDev) {
      // Production verification would go here:
      // const auth = new google.auth.GoogleAuth({ scopes: ['https://www.googleapis.com/auth/androidpublisher'] });
      // const androidPublisher = google.androidpublisher({ version: 'v3', auth });
      // const result = await androidPublisher.purchases.products.get({ packageName, productId, token });
      // if (result.data.purchaseState !== 0) throw new BadRequestException('Purchase not valid');
      throw new BadRequestException(
        'Google Play verification not configured in production',
      );
    }

    // Check for duplicate using unique index on googlePlayToken field
    const existing = await this.prisma.transaction.findUnique({
      where: { googlePlayToken: token },
    });
    if (existing) return { success: true, alreadyProcessed: true };

    // Map product ID to reward
    const productRewards: Record<
      string,
      { coins?: number; diamonds?: number; vipLevel?: number; vipDays?: number }
    > = {
      voxo_coins_small: { coins: 100 },
      voxo_coins_medium: { coins: 500 },
      voxo_coins_large: { coins: 1000 },
      voxo_diamonds_small: { diamonds: 50 },
      voxo_diamonds_medium: { diamonds: 200 },
      voxo_diamonds_large: { diamonds: 500 },
      voxo_vip_1_month: { vipLevel: 1, vipDays: 30 },
      voxo_vip_3_month: { vipLevel: 1, vipDays: 90 },
      voxo_vip_12_month: { vipLevel: 1, vipDays: 365 },
    };

    const reward = productRewards[productId];
    if (!reward) throw new BadRequestException(`Unknown product: ${productId}`);

    const txData = {
      userId,
      type: TransactionType.RECHARGE,
      currency: reward.diamonds ? Currency.DIAMONDS : Currency.COINS,
      amount: BigInt(reward.coins ?? reward.diamonds ?? 0),
      balanceBefore: BigInt(0),
      balanceAfter: BigInt(0),
      status: TransactionStatus.COMPLETED,
      description: `Google Play: ${productId}`,
      googlePlayToken: token,
      metadata: { productId, packageName },
    };

    await this.prisma.transaction.create({ data: txData });

    if (reward.coins)
      await this.walletService.addCoins(
        userId,
        reward.coins,
        `Google Play: ${productId}`,
      );
    if (reward.diamonds)
      await this.walletService.addDiamonds(
        userId,
        reward.diamonds,
        `Google Play: ${productId}`,
      );

    return { success: true, reward };
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
    );
  }
}
