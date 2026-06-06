import { Controller, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { HostLevelService } from './host-level.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller()
export class HostLevelController {
  constructor(private readonly service: HostLevelService) {}

  @UseGuards(JwtAuthGuard)
  @Get('hosts/me')
  getMyProfile(@Request() req) {
    return this.service.getHostProfile(req.user.id);
  }

  @Get('hosts/level-rules')
  getLevelRules() {
    return this.service.getLevelRules();
  }

  @Get('hosts/ranking')
  getRanking(
    @Query('period') period = 'weekly',
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return this.service.getRanking(period, +page, +limit);
  }

  @Get('hosts/:userId')
  getHostProfile(@Param('userId') userId: string) {
    return this.service.getHostProfile(userId);
  }
}
