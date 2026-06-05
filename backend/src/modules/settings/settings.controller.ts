import { Controller, Get, Patch, Post, Delete, Body, Param, Query, UseGuards, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('me')
  getSettings(@CurrentUser('id') userId: string) {
    return this.settingsService.getSettings(userId);
  }

  @Patch('me')
  updateSettings(@CurrentUser('id') userId: string, @Body() dto: any) {
    return this.settingsService.updateSettings(userId, dto);
  }

  @Get('linked-accounts')
  getLinkedAccounts(@CurrentUser('id') userId: string) {
    return this.settingsService.getLinkedAccounts(userId);
  }

  @Get('blocked')
  getBlockedUsers(
    @CurrentUser('id') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.settingsService.getBlockedUsers(userId, page, limit);
  }

  @Post('blocked/:id')
  blockUser(@CurrentUser('id') userId: string, @Param('id') targetId: string) {
    return this.settingsService.blockUser(userId, targetId);
  }

  @Delete('blocked/:id')
  unblockUser(@CurrentUser('id') userId: string, @Param('id') targetId: string) {
    return this.settingsService.unblockUser(userId, targetId);
  }

  @Post('deletion-request')
  requestDeletion(@CurrentUser('id') userId: string, @Body('reason') reason?: string) {
    return this.settingsService.requestAccountDeletion(userId, reason);
  }

  @Delete('deletion-request')
  cancelDeletion(@CurrentUser('id') userId: string) {
    return this.settingsService.cancelAccountDeletion(userId);
  }

  @Get('deletion-request')
  getDeletionRequest(@CurrentUser('id') userId: string) {
    return this.settingsService.getDeletionRequest(userId);
  }

  @Post('logs/upload')
  uploadLog(@CurrentUser('id') userId: string, @Body() dto: any) {
    return this.settingsService.uploadLog(userId, dto);
  }
}
