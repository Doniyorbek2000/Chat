import {
  Controller, Post, Get, Delete, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { ModerationService } from './moderation.service';
import { ReportUserDto, BanUserDto, MuteUserDto, ResolveReportDto, GetReportsDto } from './dto/moderation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('moderation')
@UseGuards(JwtAuthGuard)
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Post('report')
  async reportUser(@CurrentUser() user: any, @Body() dto: ReportUserDto) {
    const data = await this.moderationService.reportUser(user.id, dto);
    return { success: true, data };
  }

  @Get('reports')
  async getReports(@Query() query: GetReportsDto) {
    const data = await this.moderationService.getReports(query);
    return { success: true, data };
  }

  @Post('reports/:id/resolve')
  async resolveReport(
    @CurrentUser() user: any,
    @Param('id') reportId: string,
    @Body() dto: ResolveReportDto,
  ) {
    const data = await this.moderationService.resolveReport(user.id, reportId, dto);
    return { success: true, data };
  }

  @Post('ban')
  async banUser(@CurrentUser() user: any, @Body() dto: BanUserDto) {
    const data = await this.moderationService.banUser(user.id, dto);
    return { success: true, data };
  }

  @Delete('ban/:userId')
  async unbanUser(@CurrentUser() user: any, @Param('userId') userId: string) {
    const data = await this.moderationService.unbanUser(user.id, userId);
    return { success: true, data };
  }

  @Post('mute')
  async muteUser(@CurrentUser() user: any, @Body() dto: MuteUserDto) {
    const data = await this.moderationService.muteUser(user.id, dto);
    return { success: true, data };
  }

  @Delete('mute/:userId')
  async unmuteUser(
    @CurrentUser() user: any,
    @Param('userId') userId: string,
    @Query('roomId') roomId?: string,
  ) {
    const data = await this.moderationService.unmuteUser(user.id, userId, roomId);
    return { success: true, data };
  }

  @Get('user/:userId/reports')
  async getUserReports(@Param('userId') userId: string) {
    const data = await this.moderationService.getUserReports(userId);
    return { success: true, data };
  }
}
