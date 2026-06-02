import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { TransferDto, WithdrawDto } from './dto/wallet.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('wallet')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('wallet')
export class WalletController {
  constructor(private walletService: WalletService) {}

  @Get('balance')
  getBalance(@CurrentUser() user: any) {
    return this.walletService.getBalance(user.id);
  }

  @Get('transactions')
  getTransactions(
    @CurrentUser() user: any,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.walletService.getTransactionHistory(user.id, +page, +limit);
  }

  @Post('transfer')
  transfer(@CurrentUser() user: any, @Body() dto: TransferDto) {
    return this.walletService.transfer(user.id, dto);
  }

  @Post('withdraw')
  requestWithdrawal(@CurrentUser() user: any, @Body() dto: WithdrawDto) {
    return this.walletService.requestWithdrawal(user.id, dto);
  }
}
