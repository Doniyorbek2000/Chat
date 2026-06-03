import {
  Controller, Get, Patch, Delete,
  Param, Query, UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { GetNotificationsDto } from './dto/notification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getNotifications(@CurrentUser() user: any, @Query() query: GetNotificationsDto) {
    const data = await this.notificationsService.getNotifications(user.id, query.page, query.limit);
    return { success: true, data };
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: any) {
    const data = await this.notificationsService.getUnreadCount(user.id);
    return { success: true, data };
  }

  @Patch('read-all')
  async markAllAsRead(@CurrentUser() user: any) {
    const data = await this.notificationsService.markAllAsRead(user.id);
    return { success: true, data };
  }

  @Patch(':id/read')
  async markAsRead(@CurrentUser() user: any, @Param('id') id: string) {
    const data = await this.notificationsService.markAsRead(user.id, id);
    return { success: true, data };
  }

  @Delete(':id')
  async deleteNotification(@CurrentUser() user: any, @Param('id') id: string) {
    const data = await this.notificationsService.deleteNotification(user.id, id);
    return { success: true, data };
  }
}
