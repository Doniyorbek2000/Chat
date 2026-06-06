import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards, Request } from '@nestjs/common';
import { RiskService } from './risk.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/decorators/roles.decorator';

@Controller()
export class RiskController {
  constructor(private readonly service: RiskService) {}

  @UseGuards(JwtAuthGuard)
  @Get('risk/me')
  getMyRiskLevel(@Request() req) {
    return this.service.getMyRiskLevel(req.user.id);
  }

  // Admin
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Get('admin/risk/events')
  listRiskEvents(
    @Query('userId') userId?: string,
    @Query('eventType') eventType?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.service.listRiskEvents(userId, eventType, +page, +limit);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Get('admin/risk/users')
  listFlaggedUsers(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.service.listFlaggedUsers(+page, +limit);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post('admin/risk/users/:id/flag')
  flagUser(@Param('id') id: string, @Request() req) {
    return this.service.flagUser(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post('admin/risk/users/:id/clear')
  clearUser(@Param('id') id: string, @Request() req) {
    return this.service.clearUser(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Get('admin/risk/rules')
  listRules() {
    return this.service.listRiskRules();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post('admin/risk/rules')
  createRule(@Body() dto: any) {
    return this.service.createRiskRule(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Patch('admin/risk/rules/:id')
  updateRule(@Param('id') id: string, @Body() dto: any) {
    return this.service.updateRiskRule(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Patch('admin/risk/rules/:id/toggle')
  toggleRule(@Param('id') id: string) {
    return this.service.toggleRiskRule(id);
  }
}
