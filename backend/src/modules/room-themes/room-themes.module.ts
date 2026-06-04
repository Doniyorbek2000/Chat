import { Module } from '@nestjs/common';
import { RoomThemesController } from './room-themes.controller';
import { RoomThemesService } from './room-themes.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [PrismaModule, WalletModule],
  controllers: [RoomThemesController],
  providers: [RoomThemesService],
  exports: [RoomThemesService],
})
export class RoomThemesModule {}
