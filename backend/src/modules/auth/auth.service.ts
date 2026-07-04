import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import axios from 'axios';
import { OAuth2Client } from 'google-auth-library';
import { SmsService } from '../sms/sms.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private googleClient: OAuth2Client;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private smsService: SmsService,
    private mailService: MailService,
    @InjectRedis() private redis: Redis,
  ) {
    this.googleClient = new OAuth2Client(configService.get('google.clientId'));
  }

  private generateUid(): string {
    const digits = Math.floor(10000000 + Math.random() * 90000000).toString();
    return `VOXO${digits}`;
  }

  private async generateTokens(userId: string, uid: string, role: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, uid, role },
        {
          secret: this.configService.get('jwt.secret'),
          expiresIn: this.configService.get('jwt.expiresIn'),
        },
      ),
      this.jwtService.signAsync(
        { sub: userId, uid, role, type: 'refresh' },
        {
          secret: this.configService.get('jwt.refreshSecret'),
          expiresIn: this.configService.get('jwt.refreshExpiresIn'),
        },
      ),
    ]);

    await this.redis.set(
      `refresh_token:${userId}`,
      refreshToken,
      'EX',
      30 * 24 * 60 * 60,
    );

    return { accessToken, refreshToken };
  }

  async sendOtp(phone: string): Promise<{ message: string }> {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const key = `otp:${phone}`;

    const attempts = await this.redis.get(`otp_attempts:${phone}`);
    if (attempts && parseInt(attempts) >= 5) {
      throw new BadRequestException(
        'Too many OTP requests. Please try again after 1 hour.',
      );
    }

    await this.redis.set(key, otp, 'EX', 300);
    await this.redis.incr(`otp_attempts:${phone}`);
    await this.redis.expire(`otp_attempts:${phone}`, 3600);

    // PII-safe log: mask phone and never log OTP in production
    const maskedPhone = phone.replace(/(\+\d{3})\d+(\d{2})$/, '$1****$2');

    try {
      await this.smsService.send(
        phone,
        `Your VOXO verification code: ${otp}. Do not share it with anyone.`,
      );
    } catch {
      // Don't leave the phone rate-limited for a delivery failure
      await this.redis.del(key);
      throw new BadRequestException(
        'Failed to send verification code. Please try again.',
      );
    }

    if (!this.smsService.isConfigured) {
      // Local development only: surface the code in logs since no SMS goes out
      this.logger.debug(`[DEV] OTP for ${maskedPhone}: ${otp}`);
    }
    this.logger.log(`OTP sent to ${maskedPhone}`);

    return { message: 'OTP sent successfully' };
  }

  async verifyOtp(
    phone: string,
    otp: string,
    deviceId?: string,
    referralCode?: string,
  ) {
    const key = `otp:${phone}`;
    const storedOtp = await this.redis.get(key);

    if (!storedOtp) {
      throw new BadRequestException('OTP expired or not found');
    }

    if (storedOtp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    await this.redis.del(key);
    await this.redis.del(`otp_attempts:${phone}`);

    let user = await this.prisma.user.findUnique({ where: { phone } });

    if (!user) {
      let referredByUser = null;
      if (referralCode) {
        referredByUser = await this.prisma.user.findUnique({
          where: { referralCode },
        });
      }

      let uid = this.generateUid();
      while (await this.prisma.user.findUnique({ where: { uid } })) {
        uid = this.generateUid();
      }

      const userReferralCode = `VOXO${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      user = await this.prisma.user.create({
        data: {
          phone,
          uid,
          referralCode: userReferralCode,
          referredBy: referredByUser?.id,
          deviceId,
          displayName: `User${uid.substring(4, 9)}`,
          wallet: { create: {} },
        },
      });
    } else {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          lastSeen: new Date(),
          isOnline: true,
          ...(deviceId && { deviceId }),
        },
      });
    }

    const tokens = await this.generateTokens(user.id, user.uid, user.role);
    return { user, ...tokens };
  }

  async loginWithGoogle(
    idToken: string,
    deviceId?: string,
    referralCode?: string,
  ) {
    let ticket;
    try {
      ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: this.configService.get('google.clientId'),
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid Google token');
    }

    const payload = ticket.getPayload();
    if (!payload) {
      throw new UnauthorizedException('Failed to get Google user info');
    }

    const { sub: googleId, email, name, picture } = payload;

    let user = await this.prisma.user.findFirst({
      where: { OR: [{ googleId }, { email }] },
    });

    if (!user) {
      let referredByUser = null;
      if (referralCode) {
        referredByUser = await this.prisma.user.findUnique({
          where: { referralCode },
        });
      }

      let uid = this.generateUid();
      while (await this.prisma.user.findUnique({ where: { uid } })) {
        uid = this.generateUid();
      }

      const userReferralCode = `VOXO${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      user = await this.prisma.user.create({
        data: {
          googleId,
          email,
          displayName: name,
          avatar: picture,
          uid,
          referralCode: userReferralCode,
          referredBy: referredByUser?.id,
          isVerified: true,
          deviceId,
          wallet: { create: {} },
        },
      });
    } else {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: googleId || user.googleId,
          lastSeen: new Date(),
          isOnline: true,
          ...(deviceId && { deviceId }),
        },
      });
    }

    const tokens = await this.generateTokens(user.id, user.uid, user.role);
    return { user, ...tokens };
  }

  async loginWithApple(
    identityToken: string,
    givenName?: string,
    familyName?: string,
    deviceId?: string,
  ) {
    // Verify Apple identity token
    let appleId: string;
    let email: string | undefined;

    try {
      const decoded = this.jwtService.decode(identityToken) as any;
      appleId = decoded.sub;
      email = decoded.email;
    } catch (error) {
      throw new UnauthorizedException('Invalid Apple token');
    }

    if (!appleId) {
      throw new UnauthorizedException('Failed to get Apple user info');
    }

    let user = await this.prisma.user.findFirst({
      where: { OR: [{ appleId }, ...(email ? [{ email }] : [])] },
    });

    if (!user) {
      let uid = this.generateUid();
      while (await this.prisma.user.findUnique({ where: { uid } })) {
        uid = this.generateUid();
      }

      const displayName =
        [givenName, familyName].filter(Boolean).join(' ') ||
        `User${uid.substring(4, 9)}`;
      const userReferralCode = `VOXO${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      user = await this.prisma.user.create({
        data: {
          appleId,
          email,
          displayName,
          uid,
          referralCode: userReferralCode,
          isVerified: true,
          deviceId,
          wallet: { create: {} },
        },
      });
    } else {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          appleId: appleId || user.appleId,
          lastSeen: new Date(),
          isOnline: true,
          ...(deviceId && { deviceId }),
        },
      });
    }

    const tokens = await this.generateTokens(user.id, user.uid, user.role);
    return { user, ...tokens };
  }

  // ==================== EMAIL AUTH ====================

  private async generateUniqueUid(): Promise<string> {
    let uid = this.generateUid();
    while (await this.prisma.user.findUnique({ where: { uid } })) {
      uid = this.generateUid();
    }
    return uid;
  }

  private generateReferralCode(): string {
    return `VOXO${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }

  private async sendEmailVerificationCode(email: string): Promise<void> {
    const attempts = await this.redis.get(`email_code_attempts:${email}`);
    if (attempts && parseInt(attempts) >= 5) {
      throw new BadRequestException(
        'Too many verification requests. Please try again after 1 hour.',
      );
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await this.redis.set(`email_code:${email}`, code, 'EX', 15 * 60);
    await this.redis.incr(`email_code_attempts:${email}`);
    await this.redis.expire(`email_code_attempts:${email}`, 3600);

    await this.mailService.sendVerificationCode(email, code);

    if (!this.mailService.isConfigured) {
      // Local development only: surface the code since no email goes out
      this.logger.debug(`[DEV] email verification code for ${email}: ${code}`);
    }
  }

  async registerWithEmail(
    email: string,
    password: string,
    displayName?: string,
    deviceId?: string,
    referralCode?: string,
  ) {
    const normalizedEmail = email.trim().toLowerCase();

    const existing = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    let referredByUser = null;
    if (referralCode) {
      referredByUser = await this.prisma.user.findUnique({
        where: { referralCode },
      });
    }

    const uid = await this.generateUniqueUid();
    const passwordHash = await bcrypt.hash(password, 10);

    // Without SMTP there is no way to deliver a code — activate directly
    const autoVerify = !this.mailService.isConfigured;

    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        emailVerified: autoVerify,
        displayName: displayName || `User${uid.substring(4, 9)}`,
        uid,
        referralCode: this.generateReferralCode(),
        referredBy: referredByUser?.id,
        deviceId,
        wallet: { create: {} },
      },
    });

    if (autoVerify) {
      const tokens = await this.generateTokens(user.id, user.uid, user.role);
      return { user, ...tokens, requiresVerification: false };
    }

    await this.sendEmailVerificationCode(normalizedEmail);
    return {
      requiresVerification: true,
      message: 'Verification code sent to your email',
    };
  }

  async verifyEmail(email: string, code: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const storedCode = await this.redis.get(`email_code:${normalizedEmail}`);

    if (!storedCode) {
      throw new BadRequestException('Verification code expired or not found');
    }
    if (storedCode !== code) {
      throw new BadRequestException('Invalid verification code');
    }

    await this.redis.del(`email_code:${normalizedEmail}`);
    await this.redis.del(`email_code_attempts:${normalizedEmail}`);

    const user = await this.prisma.user.update({
      where: { email: normalizedEmail },
      data: { emailVerified: true, lastSeen: new Date(), isOnline: true },
    });

    const tokens = await this.generateTokens(user.id, user.uid, user.role);
    return { user, ...tokens };
  }

  async resendEmailCode(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (!user || user.emailVerified) {
      // Don't leak which emails are registered/unverified
      return { message: 'If the account exists, a code has been sent' };
    }

    await this.sendEmailVerificationCode(normalizedEmail);
    return { message: 'If the account exists, a code has been sent' };
  }

  async loginWithEmail(email: string, password: string, deviceId?: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.emailVerified) {
      await this.sendEmailVerificationCode(normalizedEmail);
      throw new UnauthorizedException(
        'Email not verified. A new verification code has been sent.',
      );
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastSeen: new Date(),
        isOnline: true,
        ...(deviceId && { deviceId }),
      },
    });

    const tokens = await this.generateTokens(user.id, user.uid, user.role);
    return { user: updated, ...tokens };
  }

  // ==================== FACEBOOK AUTH ====================

  async loginWithFacebook(
    accessToken: string,
    deviceId?: string,
    referralCode?: string,
  ) {
    const appSecret = this.configService.get<string>('facebook.appSecret');

    let profile: {
      id: string;
      name?: string;
      email?: string;
      picture?: { data?: { url?: string } };
    };

    try {
      const params: Record<string, string> = {
        fields: 'id,name,email,picture.width(200).height(200)',
        access_token: accessToken,
      };
      // appsecret_proof hardens Graph calls against stolen tokens
      if (appSecret) {
        params.appsecret_proof = crypto
          .createHmac('sha256', appSecret)
          .update(accessToken)
          .digest('hex');
      }

      const response = await axios.get('https://graph.facebook.com/v19.0/me', {
        params,
        timeout: 10000,
      });
      profile = response.data;
    } catch {
      throw new UnauthorizedException('Invalid Facebook token');
    }

    if (!profile?.id) {
      throw new UnauthorizedException('Failed to get Facebook user info');
    }

    const facebookId = profile.id;
    const email = profile.email?.toLowerCase();

    let user = await this.prisma.user.findFirst({
      where: { OR: [{ facebookId }, ...(email ? [{ email }] : [])] },
    });

    if (!user) {
      let referredByUser = null;
      if (referralCode) {
        referredByUser = await this.prisma.user.findUnique({
          where: { referralCode },
        });
      }

      const uid = await this.generateUniqueUid();
      user = await this.prisma.user.create({
        data: {
          facebookId,
          email,
          emailVerified: Boolean(email),
          displayName: profile.name || `User${uid.substring(4, 9)}`,
          avatar: profile.picture?.data?.url,
          uid,
          referralCode: this.generateReferralCode(),
          referredBy: referredByUser?.id,
          isVerified: true,
          deviceId,
          wallet: { create: {} },
        },
      });
    } else {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          facebookId: user.facebookId || facebookId,
          lastSeen: new Date(),
          isOnline: true,
          ...(deviceId && { deviceId }),
        },
      });
    }

    const tokens = await this.generateTokens(user.id, user.uid, user.role);
    return { user, ...tokens };
  }

  // ==================== TELEGRAM AUTH ====================

  /**
   * Login with the payload of the Telegram Login Widget
   * (https://core.telegram.org/widgets/login). The payload is signed by
   * Telegram with HMAC-SHA256 using SHA256(bot_token) as the key.
   */
  async loginWithTelegram(
    payload: {
      id: string | number;
      first_name?: string;
      last_name?: string;
      username?: string;
      photo_url?: string;
      auth_date: string | number;
      hash: string;
    },
    deviceId?: string,
    referralCode?: string,
  ) {
    const botToken = this.configService.get<string>('telegram.botToken');
    if (!botToken) {
      throw new BadRequestException('Telegram login is not configured');
    }

    const { hash, ...fields } = payload;
    if (!hash || !fields.id || !fields.auth_date) {
      throw new UnauthorizedException('Invalid Telegram payload');
    }

    // Build data_check_string: sorted key=value lines of all fields but hash
    const dataCheckString = Object.keys(fields)
      .filter((key) => fields[key] !== undefined && fields[key] !== null)
      .sort()
      .map((key) => `${key}=${fields[key]}`)
      .join('\n');

    const secretKey = crypto.createHash('sha256').update(botToken).digest();
    const expectedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    const hashesMatch =
      expectedHash.length === hash.length &&
      crypto.timingSafeEqual(
        Buffer.from(expectedHash, 'hex'),
        Buffer.from(hash, 'hex'),
      );
    if (!hashesMatch) {
      throw new UnauthorizedException('Invalid Telegram signature');
    }

    // Reject stale payloads (older than 24h) to limit replay
    const authAge = Math.floor(Date.now() / 1000) - Number(fields.auth_date);
    if (!Number.isFinite(authAge) || authAge > 24 * 60 * 60 || authAge < -300) {
      throw new UnauthorizedException('Telegram login data is expired');
    }

    const telegramId = String(fields.id);

    let user = await this.prisma.user.findUnique({ where: { telegramId } });

    if (!user) {
      let referredByUser = null;
      if (referralCode) {
        referredByUser = await this.prisma.user.findUnique({
          where: { referralCode },
        });
      }

      const uid = await this.generateUniqueUid();
      const displayName =
        [fields.first_name, fields.last_name].filter(Boolean).join(' ') ||
        fields.username ||
        `User${uid.substring(4, 9)}`;

      user = await this.prisma.user.create({
        data: {
          telegramId,
          displayName,
          avatar: fields.photo_url,
          uid,
          referralCode: this.generateReferralCode(),
          referredBy: referredByUser?.id,
          isVerified: true,
          deviceId,
          wallet: { create: {} },
        },
      });
    } else {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          lastSeen: new Date(),
          isOnline: true,
          ...(deviceId && { deviceId }),
        },
      });
    }

    const tokens = await this.generateTokens(user.id, user.uid, user.role);
    return { user, ...tokens };
  }

  async guestLogin(deviceId?: string) {
    let uid = this.generateUid();
    while (await this.prisma.user.findUnique({ where: { uid } })) {
      uid = this.generateUid();
    }

    const guestUsername = `guest_${Math.random().toString(36).substring(2, 9)}`;
    const userReferralCode = `VOXO${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const user = await this.prisma.user.create({
      data: {
        uid,
        username: guestUsername,
        displayName: `Guest${uid.substring(4, 9)}`,
        deviceId,
        referralCode: userReferralCode,
        wallet: { create: {} },
      },
    });

    const tokens = await this.generateTokens(user.id, user.uid, user.role);
    return { user, ...tokens };
  }

  async refreshToken(refreshToken: string) {
    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get('jwt.refreshSecret'),
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    const storedToken = await this.redis.get(`refresh_token:${payload.sub}`);
    if (!storedToken || storedToken !== refreshToken) {
      throw new UnauthorizedException('Refresh token revoked');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const tokens = await this.generateTokens(user.id, user.uid, user.role);
    return { user, ...tokens };
  }

  async logout(userId: string): Promise<void> {
    await this.redis.del(`refresh_token:${userId}`);
    await this.prisma.user.update({
      where: { id: userId },
      data: { isOnline: false, lastSeen: new Date() },
    });
  }
}
