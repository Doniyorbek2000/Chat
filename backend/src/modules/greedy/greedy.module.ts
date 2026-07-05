import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GreedyController } from './greedy.controller';
import { GreedyService } from './greedy.service';
import { GreedyGateway } from './greedy.gateway';
import { GreedyProcessor } from './greedy.processor';
import { PrismaModule } from '../../prisma/prisma.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    PrismaModule,
    WalletModule,
    BullModule.registerQueue({ name: 'greedy' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
      }),
    }),
  ],
  controllers: [GreedyController],
  providers: [GreedyService, GreedyGateway, GreedyProcessor],
  exports: [GreedyService],
})
export class GreedyModule {}
