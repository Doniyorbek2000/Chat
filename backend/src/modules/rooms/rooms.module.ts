import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { RoomsGateway } from './rooms.gateway';
import { PrismaModule } from '../../prisma/prisma.module';
import { WalletModule } from '../wallet/wallet.module';
import { ZegocloudModule } from '../zegocloud/zegocloud.module';
import { GiftsModule } from '../gifts/gifts.module';

@Module({
  imports: [
    PrismaModule,
    WalletModule,
    ZegocloudModule,
    GiftsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
      }),
    }),
  ],
  controllers: [RoomsController],
  providers: [RoomsService, RoomsGateway],
  exports: [RoomsService, RoomsGateway],
})
export class RoomsModule {}
