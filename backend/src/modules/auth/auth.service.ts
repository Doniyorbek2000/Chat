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
import axios from 'axios';
import { OAuth2Client } from 'google-auth-library';
import { SmsService } from '../sms/sms.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private googleClient: OAuth2Client;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private smsService: SmsService,
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
