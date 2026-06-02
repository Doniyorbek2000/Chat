import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RewardsService } from './rewards.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('rewards')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('rewards')
export class RewardsController {
  constructor(private rewardsService: RewardsService) {}

  @Get('schedule')
  getSchedule() {
    return this.rewardsService.getDailyRewardSchedule();
  }

  @Get('daily-status')
  getDailyStatus(@CurrentUser() user: any) {
    return this.rewardsService.getDailyRewardStatus(user.id);
  }

  @Post('claim-daily')
  claimDaily(@CurrentUser() user: any) {
    return this.rewardsService.claimDailyReward(user.id);
  }

  @Get('streak')
  getStreak(@CurrentUser() user: any) {
    return this.rewardsService.getStreakInfo(user.id);
  }
}
