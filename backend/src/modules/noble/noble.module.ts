import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NobleController } from './noble.controller';
import { NobleService } from './noble.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [PrismaModule, WalletModule, ConfigModule],
  controllers: [NobleController],
  providers: [NobleService],
  exports: [NobleService],
})
export class NobleModule {}
