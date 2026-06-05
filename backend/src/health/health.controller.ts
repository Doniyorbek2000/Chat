import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  @Get()
  async check() {
    const results = { status: 'ok', database: 'ok', redis: 'ok', timestamp: new Date().toISOString() };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      results.database = 'error';
      results.status = 'degraded';
    }

    try {
      await this.redis.ping();
    } catch {
      results.redis = 'error';
      results.status = 'degraded';
    }

    return results;
  }
}
