import { Module } from '@nestjs/common';
import { GrowthDashboardController } from './growth-dashboard.controller';
import { GrowthDashboardService } from './growth-dashboard.service';

@Module({
  controllers: [GrowthDashboardController],
  providers: [GrowthDashboardService],
})
export class GrowthDashboardModule {}
