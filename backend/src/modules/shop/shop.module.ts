import { Module } from '@nestjs/common';
import { ShopController } from './shop.controller';
import { ShopService } from './shop.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { WalletModule } from '../wallet/wallet.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [PrismaModule, WalletModule, UsersModule],
  controllers: [ShopController],
  providers: [ShopService],
  exports: [ShopService],
})
export class ShopModule {}
