import {
  Controller, Get, Post, Delete, Param, Query, Body, UseGuards, Request,
} from '@nestjs/common';
import { RoomModerationService } from './room-moderation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/decorators/roles.decorator';

@Controller()
export class RoomModerationController {
  constructor(private readonly service: RoomModerationService) {}

  @UseGuards(JwtAuthGuard)
  @Get('rooms/:roomId/moderators')
  getModerators(@Param('roomId') roomId: string) {
    return this.service.getModerators(roomId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('rooms/:roomId/moderators/:userId')
  addModerator(@Param('roomId') roomId: string, @Param('userId') userId: string, @Request() req) {
    return this.service.addModerator(roomId, userId, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('rooms/:roomId/moderators/:userId')
  removeModerator(@Param('roomId') roomId: string, @Param('userId') userId: string, @Request() req) {
    return this.service.removeModerator(roomId, userId, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('rooms/:roomId/users/:userId/mute')
  muteUser(
    @Param('roomId') roomId: string,
    @Param('userId') userId: string,
    @Request() req,
    @Body() body: { durationMinutes?: number },
  ) {
    return this.service.muteUser(roomId, userId, req.user.id, body.durationMinutes);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('rooms/:roomId/users/:userId/mute')
  unmuteUser(@Param('roomId') roomId: string, @Param('userId') userId: string, @Request() req) {
    return this.service.unmuteUser(roomId, userId, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('rooms/:roomId/users/:userId/kick')
  kickUser(@Param('roomId') roomId: string, @Param('userId') userId: string, @Request() req) {
    return this.service.kickUser(roomId, userId, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('rooms/:roomId/users/:userId/ban')
  banUser(
    @Param('roomId') roomId: string,
    @Param('userId') userId: string,
    @Request() req,
    @Body() body: { reason?: string },
  ) {
    return this.service.banFromRoom(roomId, userId, req.user.id, body.reason);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('rooms/:roomId/users/:userId/ban')
  unbanUser(@Param('roomId') roomId: string, @Param('userId') userId: string, @Request() req) {
    return this.service.unbanFromRoom(roomId, userId, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('rooms/:roomId/keywords')
  getKeywords(@Param('roomId') roomId: string) {
    return this.service.getKeywords(roomId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('rooms/:roomId/keywords')
  addKeyword(@Param('roomId') roomId: string, @Request() req, @Body() body: { keyword: string }) {
    return this.service.addKeyword(roomId, body.keyword, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('rooms/:roomId/keywords/:keyword')
  removeKeyword(@Param('roomId') roomId: string, @Param('keyword') keyword: string) {
    return this.service.removeKeyword(roomId, keyword);
  }

  @UseGuards(JwtAuthGuard)
  @Post('rooms/:roomId/settings/slow-mode')
  setSlowMode(
    @Param('roomId') roomId: string,
    @Request() req,
    @Body() body: { isEnabled: boolean; intervalSec: number },
  ) {
    return this.service.setSlowMode(roomId, body.isEnabled, body.intervalSec, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('rooms/:roomId/settings/gift-only')
  setGiftOnly(@Param('roomId') roomId: string, @Request() req, @Body() body: { giftOnly: boolean }) {
    return this.service.setGiftOnly(roomId, body.giftOnly, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('rooms/:roomId/moderation-logs')
  getModerationLogs(
    @Param('roomId') roomId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.service.getModerationLogs(roomId, +page, +limit);
  }

  // Admin
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.MODERATOR)
  @Get('admin/rooms/:roomId/moderation-logs')
  adminGetLogs(@Param('roomId') roomId: string, @Query('page') page = 1, @Query('limit') limit = 20) {
    return this.service.getModerationLogs(roomId, +page, +limit);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.MODERATOR)
  @Get('admin/rooms/:roomId/bans')
  adminGetBans(@Param('roomId') roomId: string) {
    return this.service.getRoomBans(roomId);
  }
}
