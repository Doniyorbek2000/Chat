import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RoomThemesService } from './room-themes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('room-themes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('room-themes')
export class RoomThemesController {
  constructor(private readonly roomThemesService: RoomThemesService) {}

  @Get()
  getRoomThemes() {
    return this.roomThemesService.getRoomThemes();
  }

  @Get('mine')
  getMyThemes(@CurrentUser('id') userId: string) {
    return this.roomThemesService.getMyThemes(userId);
  }

  @Post(':id/buy')
  buyRoomTheme(@CurrentUser('id') userId: string, @Param('id') themeId: string) {
    return this.roomThemesService.buyRoomTheme(userId, themeId);
  }

  @Post(':id/equip')
  equipRoomTheme(@CurrentUser('id') userId: string, @Param('id') themeId: string) {
    return this.roomThemesService.equipRoomTheme(userId, themeId);
  }

  @Delete('equip')
  unequipRoomTheme(@CurrentUser('id') userId: string) {
    return this.roomThemesService.unequipRoomTheme(userId);
  }
}
