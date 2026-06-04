import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NameplatesService } from './nameplates.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('nameplates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('nameplates')
export class NameplatesController {
  constructor(private readonly nameplatesService: NameplatesService) {}

  @Get()
  getNameplates() {
    return this.nameplatesService.getNameplates();
  }

  @Get('mine')
  getMyNameplates(@CurrentUser('id') userId: string) {
    return this.nameplatesService.getMyNameplates(userId);
  }

  @Post(':id/buy')
  buyNameplate(@CurrentUser('id') userId: string, @Param('id') nameplateId: string) {
    return this.nameplatesService.buyNameplate(userId, nameplateId);
  }

  @Post(':id/equip')
  equipNameplate(@CurrentUser('id') userId: string, @Param('id') nameplateId: string) {
    return this.nameplatesService.equipNameplate(userId, nameplateId);
  }

  @Delete('equip')
  unequipNameplate(@CurrentUser('id') userId: string) {
    return this.nameplatesService.unequipNameplate(userId);
  }
}
