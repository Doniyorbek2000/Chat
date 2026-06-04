import { Module } from '@nestjs/common';
import { MedalsController } from './medals.controller';
import { MedalsService } from './medals.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [PrismaModule, WalletModule],
  controllers: [MedalsController],
  providers: [MedalsService],
  exports: [MedalsService],
})
export class MedalsModule {}
