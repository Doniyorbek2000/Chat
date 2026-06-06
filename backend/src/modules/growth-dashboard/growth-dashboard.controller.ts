import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { GrowthDashboardService } from './growth-dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('admin')
export class GrowthDashboardController {
  constructor(private readonly service: GrowthDashboardService) {}

  @Get('growth/summary')
  getSummary(@Query('from') from?: string, @Query('to') to?: string) {
    return this.service.getSummary(from, to);
  }

  @Get('growth/retention')
  getRetention() {
    return this.service.getRetention();
  }

  @Get('growth/revenue')
  getRevenueChart(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('groupBy') groupBy = 'day',
  ) {
    return this.service.getRevenueChart(from, to, groupBy);
  }

  @Get('growth/hosts')
  getTopHosts(@Query('period') period = 'weekly', @Query('limit') limit = 20) {
    return this.service.getTopHosts(period, +limit);
  }

  @Get('risk/summary')
  getRiskSummary() {
    return this.service.getRiskSummary();
  }
}
