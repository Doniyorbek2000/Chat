import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendMessageDto, GetMessagesDto } from './dto/chat.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  async getConversations(@CurrentUser() user: any) {
    const data = await this.chatService.getConversations(user.id);
    return { success: true, data };
  }

  @Get('messages/:userId')
  async getMessages(
    @CurrentUser() user: any,
    @Param('userId') otherUserId: string,
    @Query() query: GetMessagesDto,
  ) {
    const data = await this.chatService.getMessages(user.id, otherUserId, query.page, query.limit);
    return { success: true, data };
  }

  @Post('messages')
  async sendMessage(@CurrentUser() user: any, @Body() dto: SendMessageDto) {
    const data = await this.chatService.sendMessage(user.id, dto);
    return { success: true, data };
  }

  @Patch('messages/:userId/read')
  async markAsRead(@CurrentUser() user: any, @Param('userId') otherUserId: string) {
    const data = await this.chatService.markAsRead(user.id, otherUserId);
    return { success: true, data };
  }

  @Delete('messages/:messageId')
  async deleteMessage(@CurrentUser() user: any, @Param('messageId') messageId: string) {
    const data = await this.chatService.deleteMessage(user.id, messageId);
    return { success: true, data };
  }
}
