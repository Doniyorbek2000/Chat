import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ShopService } from './shop.service';
import { SendItemDto } from './dto/shop.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ShopCategory, AssetGrade } from '@prisma/client';

@ApiTags('shop')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shop')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Get('items')
  getItems(
    @CurrentUser('id') userId: string,
    @Query('category') category?: ShopCategory,
    @Query('grade') grade?: AssetGrade,
  ) {
    return this.shopService.getItems(category, grade, userId);
  }

  @Get('items/mine')
  getMyItems(
    @CurrentUser('id') userId: string,
    @Query('category') category?: ShopCategory,
  ) {
    return this.shopService.getMyItems(userId, category);
  }

  @Get('items/:id')
  getItem(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.shopService.getItem(id, userId);
  }

  @Post('items/:id/buy')
  buyItem(@CurrentUser('id') userId: string, @Param('id') itemId: string) {
    return this.shopService.buyItem(userId, itemId);
  }

  @Post('items/:id/equip')
  equipItem(@CurrentUser('id') userId: string, @Param('id') itemId: string) {
    return this.shopService.equipItem(userId, itemId);
  }

  @Delete('items/:id/equip')
  unequipItem(@CurrentUser('id') userId: string, @Param('id') itemId: string) {
    return this.shopService.unequipItem(userId, itemId);
  }

  @Post('items/:id/send')
  sendItem(
    @CurrentUser('id') userId: string,
    @Param('id') itemId: string,
    @Body() dto: SendItemDto,
  ) {
    return this.shopService.sendItem(userId, itemId, dto.receiverId, dto.message);
  }
}
