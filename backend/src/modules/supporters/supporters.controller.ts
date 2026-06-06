import { Controller, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { SupportersService } from './supporters.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller()
export class SupportersController {
  constructor(private readonly service: SupportersService) {}

  @Get('rooms/:roomId/supporters')
  getRoomSupporters(
    @Param('roomId') roomId: string,
    @Query('period') period = 'session',
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.service.getRoomSupporters(roomId, period, +page, +limit);
  }

  @Get('rooms/:roomId/supporters/top3')
  getTop3(@Param('roomId') roomId: string) {
    return this.service.getTop3(roomId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('users/me/supporter-stats')
  getMyStats(@Request() req) {
    return this.service.getMyStats(req.user.id);
  }
}
