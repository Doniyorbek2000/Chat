import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { VehiclesService } from './vehicles.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('vehicles')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('vehicles')
export class VehiclesController {
  constructor(private vehiclesService: VehiclesService) {}

  @Get()
  getVehicles() {
    return this.vehiclesService.getVehicles();
  }

  @Get('my')
  getUserVehicles(@CurrentUser() user: any) {
    return this.vehiclesService.getUserVehicles(user.id);
  }

  @Post(':id/purchase')
  purchaseVehicle(@CurrentUser() user: any, @Param('id') id: string) {
    return this.vehiclesService.purchaseVehicle(user.id, id);
  }

  @Post(':id/activate')
  activateVehicle(@CurrentUser() user: any, @Param('id') id: string) {
    return this.vehiclesService.activateVehicle(user.id, id);
  }

  @Delete('active')
  deactivateVehicle(@CurrentUser() user: any) {
    return this.vehiclesService.deactivateVehicle(user.id);
  }
}
