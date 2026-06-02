import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  uid: string;
  role: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        uid: true,
        username: true,
        displayName: true,
        avatar: true,
        phone: true,
        email: true,
        role: true,
        isVip: true,
        vipLevel: true,
        isOnline: true,
        isBanned: true,
        bannedUntil: true,
        country: true,
        language: true,
        level: true,
        xp: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.isBanned) {
      if (!user.bannedUntil || user.bannedUntil > new Date()) {
        throw new UnauthorizedException('Your account has been banned');
      }
    }

    return user;
  }
}
