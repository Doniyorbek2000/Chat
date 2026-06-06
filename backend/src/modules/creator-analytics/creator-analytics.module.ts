import { Module } from '@nestjs/common';
import { CreatorAnalyticsController } from './creator-analytics.controller';
import { CreatorAnalyticsService } from './creator-analytics.service';

@Module({
  controllers: [CreatorAnalyticsController],
  providers: [CreatorAnalyticsService],
  exports: [CreatorAnalyticsService],
})
export class CreatorAnalyticsModule {}
