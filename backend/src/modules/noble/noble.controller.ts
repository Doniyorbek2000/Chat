import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NobleService } from './noble.service';
import { PurchaseNobleDto, SendNobleDto } from './dto/noble.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('noble')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('noble')
export class NobleController {
  constructor(private readonly nobleService: NobleService) {}

  @Get('plans')
  getPlans() {
    return this.nobleService.getPlans();
  }

  @Get('me')
  getMySubscription(@CurrentUser('id') userId: string) {
    return this.nobleService.getMySubscription(userId);
  }

  @Post('purchase')
  purchaseNoble(
    @CurrentUser('id') userId: string,
    @Body() dto: PurchaseNobleDto,
  ) {
    return this.nobleService.purchaseNoble(userId, dto);
  }

  @Post('send')
  sendNoble(
    @CurrentUser('id') senderId: string,
    @Body() dto: SendNobleDto,
  ) {
    return this.nobleService.sendNoble(senderId, dto);
  }

  @Post('cancel')
  cancelNoble(@CurrentUser('id') userId: string) {
    return this.nobleService.cancelNoble(userId);
  }

  @Get('history')
  getHistory(@CurrentUser('id') userId: string) {
    return this.nobleService.getHistory(userId);
  }
}
