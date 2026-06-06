import {
  Controller, Get, Post, Patch, Param, Query, Body, UseGuards, Request,
} from '@nestjs/common';
import { MissionsService } from './missions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/decorators/roles.decorator';

@Controller()
export class MissionsController {
  constructor(private readonly service: MissionsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('missions/daily')
  getDailyMissions(@Request() req) {
    return this.service.getDailyMissions(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('missions/weekly')
  getWeeklyMissions(@Request() req) {
    return this.service.getWeeklyMissions(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('missions/me')
  getMyMissions(@Request() req) {
    return this.service.getMyMissions(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('missions/:id/claim')
  claimMission(@Param('id') id: string, @Request() req) {
    return this.service.claimMission(req.user.id, id);
  }

  // Admin
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Get('admin/missions')
  adminListMissions(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.service.listMissions(+page, +limit);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post('admin/missions')
  adminCreateMission(@Body() dto: any) {
    return this.service.createMission(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Patch('admin/missions/:id')
  adminUpdateMission(@Param('id') id: string, @Body() dto: any) {
    return this.service.updateMission(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Patch('admin/missions/:id/toggle')
  adminToggleMission(@Param('id') id: string) {
    return this.service.toggleMission(id);
  }
}
