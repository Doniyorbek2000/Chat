import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

/**
 * SMS delivery via Eskiz.uz (https://notify.eskiz.uz).
 *
 * Auth flow: POST /auth/login with the account email/password returns a
 * Bearer token valid for ~30 days. The token is cached in memory and
 * refreshed transparently on 401.
 *
 * When ESKIZ_EMAIL/ESKIZ_PASSWORD are not configured (local dev, CI),
 * sending is skipped and the message is logged instead, so the OTP flow
 * stays usable without a paid account.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly http: AxiosInstance;
  private readonly email?: string;
  private readonly password?: string;
  private readonly from: string;

  private authToken: string | null = null;
  private tokenFetchedAt = 0;
  /** Refresh the cached Eskiz token after 25 days (it lives ~30). */
  private static readonly TOKEN_TTL_MS = 25 * 24 * 60 * 60 * 1000;

  constructor(private readonly config: ConfigService) {
    this.email = this.config.get<string>('sms.eskizEmail');
    this.password = this.config.get<string>('sms.eskizPassword');
    this.from = this.config.get<string>('sms.eskizFrom') || '4546';

    this.http = axios.create({
      baseURL:
        this.config.get<string>('sms.eskizBaseUrl') ||
        'https://notify.eskiz.uz/api',
      timeout: 15000,
    });

    if (!this.isConfigured) {
      this.logger.warn(
        'Eskiz.uz credentials not configured — SMS sending disabled (messages will be logged only)',
      );
    }
  }

  get isConfigured(): boolean {
    return Boolean(this.email && this.password);
  }

  /**
   * Send an SMS. Returns true when the message was accepted by the
   * provider (or intentionally skipped in unconfigured environments).
   * Throws on hard provider failures so callers can surface the error.
   */
  async send(phone: string, message: string): Promise<boolean> {
    const maskedPhone = this.maskPhone(phone);

    if (!this.isConfigured) {
      this.logger.log(`[SMS skipped — not configured] to=${maskedPhone}`);
      return true;
    }

    // Eskiz expects digits only, without the leading '+'
    const mobilePhone = phone.replace(/\D/g, '');

    try {
      await this.sendViaEskiz(mobilePhone, message);
      this.logger.log(`SMS sent to ${maskedPhone}`);
      return true;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        // Cached token expired server-side — re-login once and retry
        this.authToken = null;
        await this.sendViaEskiz(mobilePhone, message);
        this.logger.log(`SMS sent to ${maskedPhone} (after token refresh)`);
        return true;
      }
      const detail = axios.isAxiosError(error)
        ? JSON.stringify(error.response?.data ?? error.message)
        : String(error);
      this.logger.error(`Failed to send SMS to ${maskedPhone}: ${detail}`);
      throw error;
    }
  }

  private async sendViaEskiz(
    mobilePhone: string,
    message: string,
  ): Promise<void> {
    const token = await this.getAuthToken();
    await this.http.post(
      '/message/sms/send',
      {
        mobile_phone: mobilePhone,
        message,
        from: this.from,
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }

  private async getAuthToken(): Promise<string> {
    const isFresh =
      this.authToken &&
      Date.now() - this.tokenFetchedAt < SmsService.TOKEN_TTL_MS;
    if (isFresh) return this.authToken;

    const response = await this.http.post('/auth/login', {
      email: this.email,
      password: this.password,
    });

    const token = response.data?.data?.token;
    if (!token) {
      throw new Error('Eskiz.uz login did not return a token');
    }

    this.authToken = token;
    this.tokenFetchedAt = Date.now();
    this.logger.log('Obtained new Eskiz.uz auth token');
    return token;
  }

  private maskPhone(phone: string): string {
    return phone.replace(/(\+?\d{3})\d+(\d{2})$/, '$1****$2');
  }
}
