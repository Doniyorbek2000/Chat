import { Module } from '@nestjs/common';
import { NameplatesController } from './nameplates.controller';
import { NameplatesService } from './nameplates.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [PrismaModule, WalletModule],
  controllers: [NameplatesController],
  providers: [NameplatesService],
  exports: [NameplatesService],
})
export class NameplatesModule {}
