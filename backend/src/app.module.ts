import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { RedisModule } from '@nestjs-modules/ioredis';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { GiftsModule } from './modules/gifts/gifts.module';
import { VipModule } from './modules/vip/vip.module';
import { FamilyModule } from './modules/family/family.module';
import { CoupleModule } from './modules/couple/couple.module';
import { PkBattleModule } from './modules/pk-battle/pk-battle.module';
import { LeaderboardModule } from './modules/leaderboard/leaderboard.module';
import { ChatModule } from './modules/chat/chat.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { StorageModule } from './modules/storage/storage.module';
import { RewardsModule } from './modules/rewards/rewards.module';
import { AgencyModule } from './modules/agency/agency.module';
import { ModerationModule } from './modules/moderation/moderation.module';
import { EventsModule } from './modules/events/events.module';
import { AdminModule } from './modules/admin/admin.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { ZegocloudModule } from './modules/zegocloud/zegocloud.module';
import { NobleModule } from './modules/noble/noble.module';
import { MedalsModule } from './modules/medals/medals.module';
import { ShopModule } from './modules/shop/shop.module';
import { NameplatesModule } from './modules/nameplates/nameplates.module';
import { RoomThemesModule } from './modules/room-themes/room-themes.module';
import { CollectionModule } from './modules/collection/collection.module';
import { DiscoverModule } from './modules/discover/discover.module';
import { ReferralsModule } from './modules/referrals/referrals.module';
import { HomeModule } from './modules/home/home.module';
import { SettingsModule } from './modules/settings/settings.module';
import { SupportModule } from './modules/support/support.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('throttle.ttl') || 60000,
          limit: config.get<number>('throttle.limit') || 100,
        },
      ],
    }),
    ScheduleModule.forRoot(),
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'single',
        url: config.get<string>('redis.url') || 'redis://localhost:6379',
      }),
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: config.get<string>('redis.url'),
      }),
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    WalletModule,
    RoomsModule,
    GiftsModule,
    VipModule,
    FamilyModule,
    CoupleModule,
    PkBattleModule,
    LeaderboardModule,
    ChatModule,
    NotificationsModule,
    StorageModule,
    RewardsModule,
    AgencyModule,
    ModerationModule,
    EventsModule,
    AdminModule,
    PaymentsModule,
    VehiclesModule,
    ZegocloudModule,
    NobleModule,
    MedalsModule,
    ShopModule,
    NameplatesModule,
    RoomThemesModule,
    CollectionModule,
    DiscoverModule,
    ReferralsModule,
    HomeModule,
    SettingsModule,
    SupportModule,
    HealthModule,
  ],
})
export class AppModule {}
