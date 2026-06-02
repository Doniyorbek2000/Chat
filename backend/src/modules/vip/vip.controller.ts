import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { VipService } from './vip.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class PurchaseVipDto {
  @ApiProperty({ example: 'plan-cuid-123' })
  @IsString()
  @IsNotEmpty()
  planId: string;
}

@ApiTags('VIP')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('vip')
export class VipController {
  constructor(private readonly vipService: VipService) {}

  @Get('plans')
  @ApiOperation({ summary: 'Get all VIP plans' })
  getVipPlans() {
    return this.vipService.getVipPlans();
  }

  @Get('status')
  @ApiOperation({ summary: 'Get current VIP status' })
  getVipStatus(@CurrentUser('id') userId: string) {
    return this.vipService.getVipStatus(userId);
  }

  @Post('purchase')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Purchase VIP subscription' })
  purchaseVip(
    @CurrentUser('id') userId: string,
    @Body() dto: PurchaseVipDto,
  ) {
    return this.vipService.purchaseVip(userId, dto.planId);
  }

  @Post('renew')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renew VIP subscription' })
  renewVip(
    @CurrentUser('id') userId: string,
    @Body() dto: PurchaseVipDto,
  ) {
    return this.vipService.renewVip(userId, dto.planId);
  }

  @Get('benefits')
  @ApiOperation({ summary: 'Get current VIP benefits' })
  getVipBenefits(@CurrentUser('id') userId: string) {
    return this.vipService.checkVipBenefits(userId);
  }

  @Get('frame')
  @ApiOperation({ summary: 'Get VIP frame and effects' })
  getVipFrame(@CurrentUser('id') userId: string) {
    return this.vipService.applyVipFrame(userId);
  }
}
