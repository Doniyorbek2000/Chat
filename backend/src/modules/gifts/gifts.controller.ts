import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GiftsService } from './gifts.service';
import { SendGiftDto } from './dto/gift.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('gifts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('gifts')
export class GiftsController {
  constructor(private giftsService: GiftsService) {}

  @Get()
  getGifts(@Query('category') category?: string) {
    return this.giftsService.getGifts(category);
  }

  @Get('categories')
  getGiftsByCategory() {
    return this.giftsService.getGiftsByCategory();
  }

  @Post('send')
  sendGift(@CurrentUser() user: any, @Body() dto: SendGiftDto) {
    return this.giftsService.sendGift(user.id, dto);
  }

  @Get('history')
  getHistory(
    @CurrentUser() user: any,
    @Query('type') type: 'sent' | 'received' = 'sent',
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.giftsService.getGiftHistory(user.id, type, +page, +limit);
  }

  @Get('top-gifters')
  getTopGifters(@Query('roomId') roomId?: string, @Query('limit') limit = 10) {
    return this.giftsService.getTopGifters(roomId, +limit);
  }

  @Get('top-receivers')
  getTopReceivers(@Query('roomId') roomId?: string, @Query('limit') limit = 10) {
    return this.giftsService.getTopReceivers(roomId, +limit);
  }
}
