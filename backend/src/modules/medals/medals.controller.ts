import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MedalsService } from './medals.service';
import { UnlockMedalDto, EquipMedalDto, SetMedalWallDto } from './dto/medals.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MedalCategory } from '@prisma/client';

@ApiTags('medals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('medals')
export class MedalsController {
  constructor(private readonly medalsService: MedalsService) {}

  @Get()
  getMedals(@Query('category') category?: MedalCategory) {
    return this.medalsService.getMedals(category);
  }

  @Get('me')
  getMyMedals(@CurrentUser('id') userId: string) {
    return this.medalsService.getMyMedals(userId);
  }

  @Get(':id')
  getMedal(@Param('id') id: string) {
    return this.medalsService.getMedalById(id);
  }

  @Get(':id/owners')
  getMedalOwners(
    @Param('id') id: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.medalsService.getMedalOwners(id, limit);
  }

  @Get('prestige-rules')
  getPrestigeRules() {
    return this.medalsService.getPrestigeRules();
  }

  @Get('leaderboard')
  getLeaderboard(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit = 50,
  ) {
    return this.medalsService.getLeaderboard(limit);
  }

  @Post('wall')
  setMedalWallSlot(
    @CurrentUser('id') userId: string,
    @Body() dto: SetMedalWallDto,
  ) {
    return this.medalsService.setMedalWallSlot(userId, dto);
  }

  @Post(':id/unlock')
  unlockMedal(
    @CurrentUser('id') userId: string,
    @Param('id') medalId: string,
  ) {
    return this.medalsService.unlockMedal(userId, { medalId });
  }

  @Post(':id/equip')
  equipMedal(
    @CurrentUser('id') userId: string,
    @Param('id') medalId: string,
    @Body() dto: Omit<EquipMedalDto, 'medalId'>,
  ) {
    return this.medalsService.equipMedal(userId, { ...dto, medalId });
  }

  @Delete(':id/equip')
  unequipMedal(
    @CurrentUser('id') userId: string,
    @Param('id') medalId: string,
  ) {
    return this.medalsService.unequipMedal(userId, medalId);
  }
}
