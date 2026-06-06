import {
  Controller, Get, Post, Param, Query, Body, UseGuards, Request,
} from '@nestjs/common';
import { AgencySalaryService } from './agency-salary.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/decorators/roles.decorator';

@Controller()
export class AgencySalaryController {
  constructor(private readonly service: AgencySalaryService) {}

  @UseGuards(JwtAuthGuard)
  @Get('agency/hosts/me/earnings')
  getMyEarnings(@Request() req, @Query('periodKey') periodKey?: string) {
    return this.service.getMyEarnings(req.user.id, periodKey);
  }

  @UseGuards(JwtAuthGuard)
  @Get('agency/hosts/me/payouts')
  getMyPayouts(@Request() req) {
    return this.service.getMyPayouts(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('agency/hosts/me/payout-request')
  requestPayout(@Request() req, @Body() body: { periodKey: string }) {
    return this.service.requestPayout(req.user.id, body.periodKey);
  }

  @UseGuards(JwtAuthGuard)
  @Get('agency/me/hosts')
  getAgencyHosts(@Request() req) {
    return this.service.getAgencyHosts(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('agency/me/hosts/invite')
  inviteHost(@Request() req, @Body() body: { userId: string }) {
    return this.service.inviteHost(req.user.id, body.userId);
  }

  // Admin
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Get('admin/agency/payouts')
  adminListPendingPayouts(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.service.adminListPendingPayouts(+page, +limit);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Get('admin/agency/payouts/all')
  adminListAllPayouts(
    @Query('status') status?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.service.adminListAllPayouts(status, +page, +limit);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post('admin/agency/payouts/:id/approve')
  adminApprovePayout(@Param('id') id: string, @Request() req) {
    return this.service.adminApprovePayout(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post('admin/agency/payouts/:id/reject')
  adminRejectPayout(
    @Param('id') id: string,
    @Request() req,
    @Body() body: { reason: string },
  ) {
    return this.service.adminRejectPayout(id, req.user.id, body.reason);
  }
}
