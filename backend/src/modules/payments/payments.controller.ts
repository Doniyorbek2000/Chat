import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { IsString, IsOptional } from 'class-validator';

class GooglePlayVerifyDto {
  @IsString()
  token: string;

  @IsString()
  productId: string;

  @IsString()
  @IsOptional()
  packageName?: string;
}
import { PaymentsService } from './payments.service';
import {
  InitiatePaymentDto,
  ClickPrepareDto,
  ClickCompleteDto,
  PaymeDto,
  GetTransactionHistoryDto,
} from './dto/payments.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initiate')
  async initiatePayment(
    @CurrentUser() user: any,
    @Body() dto: InitiatePaymentDto,
  ) {
    const data = await this.paymentsService.initiatePayment(user.id, dto);
    return { success: true, data };
  }

  @Post('click/prepare')
  @Public()
  async clickPrepare(@Body() dto: ClickPrepareDto) {
    return this.paymentsService.handleClickPrepare(dto);
  }

  @Post('click/complete')
  @Public()
  async clickComplete(@Body() dto: ClickCompleteDto) {
    return this.paymentsService.handleClickComplete(dto);
  }

  @Post('payme')
  @Public()
  async payme(@Body() dto: PaymeDto) {
    return this.paymentsService.handlePayme(dto);
  }

  @Get('history')
  async getHistory(
    @CurrentUser() user: any,
    @Query() query: GetTransactionHistoryDto,
  ) {
    const data = await this.paymentsService.getTransactionHistory(
      user.id,
      query.page,
      query.limit,
    );
    return { success: true, data };
  }

  @Post('google-play/verify')
  async verifyGooglePlay(
    @CurrentUser() user: any,
    @Body() dto: GooglePlayVerifyDto,
  ) {
    const data = await this.paymentsService.verifyGooglePlayPurchase(user.id, {
      token: dto.token,
      productId: dto.productId,
      packageName: dto.packageName || 'com.voxo.app',
    });
    return { success: true, data };
  }
}
