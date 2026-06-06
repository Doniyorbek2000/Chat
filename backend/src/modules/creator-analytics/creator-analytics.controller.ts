import { Controller, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { CreatorAnalyticsService } from './creator-analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/decorators/roles.decorator';

@Controller()
export class CreatorAnalyticsController {
  constructor(private readonly service: CreatorAnalyticsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('creator/analytics/summary')
  getSummary(@Request() req, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.getSummary(req.user.id, from, to);
  }

  @UseGuards(JwtAuthGuard)
  @Get('creator/analytics/gifts')
  getGiftAnalytics(@Request() req, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.getGiftAnalytics(req.user.id, from, to);
  }

  @UseGuards(JwtAuthGuard)
  @Get('creator/analytics/supporters')
  getTopSupporters(@Request() req, @Query('limit') limit = 20) {
    return this.service.getTopSupporters(req.user.id, +limit);
  }

  @UseGuards(JwtAuthGuard)
  @Get('creator/analytics/rooms')
  getRoomAnalytics(@Request() req, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.getRoomAnalytics(req.user.id, from, to);
  }

  @UseGuards(JwtAuthGuard)
  @Get('creator/analytics/followers')
  getFollowerAnalytics(@Request() req, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.getFollowerAnalytics(req.user.id, from, to);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Get('admin/creator/:userId/analytics')
  adminGetCreatorAnalytics(
    @Param('userId') userId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.getSummary(userId, from, to);
  }
}
