import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

/**
 * Transactional email via SMTP (nodemailer).
 *
 * Configured with SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_FROM.
 * When unconfigured (local dev, CI) sending is skipped and the message is
 * logged, so the email auth flow stays usable without a mail account.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('smtp.host');
    const user = this.config.get<string>('smtp.user');
    const pass = this.config.get<string>('smtp.pass');
    this.from =
      this.config.get<string>('smtp.from') || 'VOXO <no-reply@voxo.app>';

    if (!host) {
      this.logger.warn(
        'SMTP not configured — emails disabled (messages will be logged only)',
      );
      return;
    }

    const port = this.config.get<number>('smtp.port') || 587;
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      ...(user && pass && { auth: { user, pass } }),
    });
    this.logger.log(`SMTP transport ready (${host}:${port})`);
  }

  get isConfigured(): boolean {
    return this.transporter !== null;
  }

  /**
   * Send an email. Returns true when handed to the SMTP server (or
   * intentionally skipped in unconfigured environments). Throws on
   * hard SMTP failures so callers can surface the error.
   */
  async send(to: string, subject: string, html: string): Promise<boolean> {
    if (!this.transporter) {
      this.logger.log(`[Email skipped — not configured] to=${this.mask(to)} subject="${subject}"`);
      return true;
    }

    try {
      await this.transporter.sendMail({ from: this.from, to, subject, html });
      this.logger.log(`Email sent to ${this.mask(to)}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${this.mask(to)}: ${error.message}`);
      throw error;
    }
  }

  async sendVerificationCode(to: string, code: string): Promise<boolean> {
    return this.send(
      to,
      'Your VOXO verification code',
      `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>VOXO</h2>
        <p>Your verification code:</p>
        <p style="font-size:32px;font-weight:bold;letter-spacing:8px">${code}</p>
        <p>This code expires in 15 minutes. If you didn't request it, ignore this email.</p>
      </div>`,
    );
  }

  private mask(email: string): string {
    const [name, domain] = email.split('@');
    if (!domain) return '***';
    return `${name.slice(0, 2)}***@${domain}`;
  }
}
