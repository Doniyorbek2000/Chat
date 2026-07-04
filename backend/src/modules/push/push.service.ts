import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { PrismaService } from '../../prisma/prisma.service';

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

/**
 * Push notifications via Firebase Cloud Messaging (firebase-admin).
 *
 * Initialized from FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL /
 * FIREBASE_PRIVATE_KEY. When these are absent (local dev, CI) every send
 * becomes a logged no-op, so callers never need to guard.
 *
 * Invalid device tokens (uninstalled app, rotated token) are pruned from
 * the corresponding user rows automatically after each send.
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private messaging: admin.messaging.Messaging | null = null;

  /** FCM allows at most 500 messages per sendEach batch. */
  private static readonly BATCH_SIZE = 500;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const projectId = this.config.get<string>('firebase.projectId');
    const clientEmail = this.config.get<string>('firebase.clientEmail');
    // .env files commonly store the key with literal \n sequences
    const privateKey = this.config
      .get<string>('firebase.privateKey')
      ?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      this.logger.warn(
        'Firebase credentials not configured — push notifications disabled',
      );
      return;
    }

    try {
      const app =
        admin.apps.length > 0
          ? admin.apps[0]
          : admin.initializeApp({
              credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey,
              }),
            });
      this.messaging = app.messaging();
      this.logger.log(`Firebase Admin initialized (project=${projectId})`);
    } catch (error) {
      this.logger.error(`Failed to initialize Firebase Admin: ${error.message}`);
    }
  }

  get isConfigured(): boolean {
    return this.messaging !== null;
  }

  /**
   * Send a push to a single user (looked up by their stored FCM token).
   * Returns true if the message was handed to FCM.
   */
  async sendToUser(userId: string, payload: PushPayload): Promise<boolean> {
    if (!this.messaging) return false;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true },
    });
    if (!user?.fcmToken) return false;

    try {
      await this.messaging.send(this.buildMessage(user.fcmToken, payload));
      return true;
    } catch (error) {
      if (this.isInvalidTokenError(error)) {
        await this.clearToken(user.fcmToken);
        return false;
      }
      this.logger.error(`Push to user ${userId} failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Send a push to an explicit list of device tokens (batched by 500).
   * Returns the number of successful deliveries.
   */
  async sendToTokens(tokens: string[], payload: PushPayload): Promise<number> {
    if (!this.messaging || tokens.length === 0) return 0;

    let successCount = 0;
    for (let i = 0; i < tokens.length; i += PushService.BATCH_SIZE) {
      const batch = tokens.slice(i, i + PushService.BATCH_SIZE);
      const response = await this.messaging.sendEach(
        batch.map((token) => this.buildMessage(token, payload)),
      );
      successCount += response.successCount;

      // Prune tokens FCM reports as gone
      const deadTokens = batch.filter(
        (_, idx) =>
          !response.responses[idx].success &&
          this.isInvalidTokenError(response.responses[idx].error),
      );
      if (deadTokens.length > 0) {
        await this.prisma.user.updateMany({
          where: { fcmToken: { in: deadTokens } },
          data: { fcmToken: null },
        });
        this.logger.log(`Pruned ${deadTokens.length} dead FCM tokens`);
      }
    }
    return successCount;
  }

  /**
   * Broadcast to every non-banned user that has a device token.
   * Returns { targeted, delivered } counts.
   */
  async broadcast(
    payload: PushPayload,
  ): Promise<{ targeted: number; delivered: number }> {
    if (!this.messaging) return { targeted: 0, delivered: 0 };

    let targeted = 0;
    let delivered = 0;
    let cursor: string | undefined;

    // Page through users to keep memory bounded on large datasets
    for (;;) {
      const users = await this.prisma.user.findMany({
        where: { isBanned: false, fcmToken: { not: null } },
        select: { id: true, fcmToken: true },
        orderBy: { id: 'asc' },
        take: 1000,
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      });
      if (users.length === 0) break;

      cursor = users[users.length - 1].id;
      const tokens = users.map((u) => u.fcmToken).filter(Boolean) as string[];
      targeted += tokens.length;
      delivered += await this.sendToTokens(tokens, payload);

      if (users.length < 1000) break;
    }

    this.logger.log(`Broadcast: delivered ${delivered}/${targeted} pushes`);
    return { targeted, delivered };
  }

  private buildMessage(
    token: string,
    payload: PushPayload,
  ): admin.messaging.Message {
    return {
      token,
      notification: {
        title: payload.title,
        body: payload.body,
        ...(payload.imageUrl && { imageUrl: payload.imageUrl }),
      },
      data: payload.data ?? {},
      android: {
        priority: 'high',
        notification: { channelId: 'voxo_default', sound: 'default' },
      },
      apns: {
        payload: { aps: { sound: 'default', badge: 1 } },
      },
    };
  }

  private isInvalidTokenError(error: unknown): boolean {
    const code = (error as { code?: string })?.code ?? '';
    return (
      code === 'messaging/registration-token-not-registered' ||
      code === 'messaging/invalid-registration-token' ||
      code === 'messaging/invalid-argument'
    );
  }

  private async clearToken(token: string): Promise<void> {
    await this.prisma.user.updateMany({
      where: { fcmToken: token },
      data: { fcmToken: null },
    });
  }
}
