import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { WalletModule } from '../wallet/wallet.module';
import { DiscoverModule } from '../discover/discover.module';
import { ReferralsModule } from '../referrals/referrals.module';
import { PushModule } from '../push/push.module';

@Module({
  imports: [
    PrismaModule,
    WalletModule,
    DiscoverModule,
    ReferralsModule,
    PushModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
