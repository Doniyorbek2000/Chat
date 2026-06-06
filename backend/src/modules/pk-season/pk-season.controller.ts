import {
  Controller, Get, Post, Patch, Param, Query, Body, UseGuards, Request,
} from '@nestjs/common';
import { PkSeasonService } from './pk-season.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/decorators/roles.decorator';

@Controller()
export class PkSeasonController {
  constructor(private readonly service: PkSeasonService) {}

  @Get('pk/seasons/current')
  getCurrentSeason() {
    return this.service.getCurrentSeason();
  }

  @Get('pk/seasons/ranking')
  getSeasonRanking(
    @Query('seasonId') seasonId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 100,
  ) {
    return this.service.getSeasonRanking(seasonId, +page, +limit);
  }

  @UseGuards(JwtAuthGuard)
  @Get('pk/me/stats')
  getMyStats(@Request() req) {
    return this.service.getMyStats(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('pk/me/rewards')
  getMyRewards(@Request() req) {
    return this.service.getMyRewards(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('pk/seasons/:id/claim')
  claimReward(@Param('id') id: string, @Request() req) {
    return this.service.claimSeasonReward(req.user.id, id);
  }

  // Admin
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Get('admin/pk/seasons')
  adminListSeasons(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.service.listSeasons(+page, +limit);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post('admin/pk/seasons')
  adminCreateSeason(@Body() dto: any) {
    return this.service.createSeason(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Patch('admin/pk/seasons/:id')
  adminUpdateSeason(@Param('id') id: string, @Body() dto: any) {
    return this.service.updateSeason(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post('admin/pk/seasons/:id/end')
  adminEndSeason(@Param('id') id: string) {
    return this.service.endSeason(id);
  }
}
