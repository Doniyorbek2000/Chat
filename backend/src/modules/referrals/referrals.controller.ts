import { Controller, Get, Post, Body, Query, ParseIntPipe, DefaultValuePipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReferralsService } from './referrals.service';
import { ApplyReferralCodeDto } from './dto/referral.dto';

@ApiTags('Referrals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('referrals')
export class ReferralsController {
  constructor(private readonly svc: ReferralsService) {}

  @Get('me')
  getMyInfo(@CurrentUser('id') userId: string) {
    return this.svc.getMyReferralInfo(userId);
  }

  @Post('apply-code')
  applyCode(@CurrentUser('id') userId: string, @Body() dto: ApplyReferralCodeDto) {
    return this.svc.applyCode(userId, dto);
  }

  @Get('history')
  getHistory(
    @CurrentUser('id') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.svc.getRebateHistory(userId, page, limit);
  }

  @Get('rebate/ranking')
  getRanking(@Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20) {
    return this.svc.getRebateRanking(limit);
  }

  @Post('share-link')
  shareLink(@CurrentUser('id') userId: string) {
    return this.svc.getOrCreateCode(userId).then(c => ({
      code: c.code,
      link: `https://voxo.app/join/${c.code}`,
    }));
  }

  @Get('friends')
  getFriends(@CurrentUser('id') userId: string) {
    return this.svc.getMyReferralInfo(userId).then(r => ({
      friends: r.friends,
      friendsCount: r.friendsCount,
    }));
  }
}
