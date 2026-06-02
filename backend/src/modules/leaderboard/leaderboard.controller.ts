import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { LeaderboardService } from './leaderboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Leaderboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get('gifters')
  @ApiOperation({ summary: 'Get top gifters ranking' })
  @ApiQuery({ name: 'period', required: false, enum: ['daily', 'weekly', 'monthly', 'alltime'] })
  @ApiQuery({ name: 'limit', required: false })
  getGiftersRanking(
    @Query('period') period: any = 'weekly',
    @Query('limit') limit = 50,
  ) {
    return this.leaderboardService.getGiftersRanking(period, +limit);
  }

  @Get('receivers')
  @ApiOperation({ summary: 'Get top receivers ranking' })
  @ApiQuery({ name: 'period', required: false, enum: ['daily', 'weekly', 'monthly', 'alltime'] })
  getReceiversRanking(
    @Query('period') period: any = 'weekly',
    @Query('limit') limit = 50,
  ) {
    return this.leaderboardService.getReceiversRanking(period, +limit);
  }

  @Get('rooms')
  @ApiOperation({ summary: 'Get top rooms ranking' })
  getRoomsRanking(
    @Query('period') period: any = 'weekly',
    @Query('limit') limit = 50,
  ) {
    return this.leaderboardService.getRoomsRanking(period, +limit);
  }

  @Get('families')
  @ApiOperation({ summary: 'Get top families ranking' })
  getFamiliesRanking(
    @Query('period') period: any = 'weekly',
    @Query('limit') limit = 50,
  ) {
    return this.leaderboardService.getFamiliesRanking(period, +limit);
  }

  @Get('couples')
  @ApiOperation({ summary: 'Get top couples ranking' })
  getCouplesRanking(@Query('limit') limit = 50) {
    return this.leaderboardService.getCouplesRanking('alltime', +limit);
  }

  @Get('recharge')
  @ApiOperation({ summary: 'Get top rechargers ranking' })
  getRechargeRanking(
    @Query('period') period: any = 'weekly',
    @Query('limit') limit = 50,
  ) {
    return this.leaderboardService.getRechargeRanking(period, +limit);
  }

  @Get(':type')
  @ApiOperation({ summary: 'Get leaderboard by type and period' })
  @ApiParam({ name: 'type', enum: ['gifters', 'receivers', 'rooms', 'families', 'couples', 'recharge'] })
  @ApiQuery({ name: 'period', required: false, enum: ['daily', 'weekly', 'monthly', 'alltime'] })
  getLeaderboard(
    @Param('type') type: string,
    @Query('period') period: any = 'weekly',
    @Query('limit') limit = 50,
  ) {
    switch (type) {
      case 'gifters':
        return this.leaderboardService.getGiftersRanking(period, +limit);
      case 'receivers':
        return this.leaderboardService.getReceiversRanking(period, +limit);
      case 'rooms':
        return this.leaderboardService.getRoomsRanking(period, +limit);
      case 'families':
        return this.leaderboardService.getFamiliesRanking(period, +limit);
      case 'couples':
        return this.leaderboardService.getCouplesRanking(period, +limit);
      case 'recharge':
        return this.leaderboardService.getRechargeRanking(period, +limit);
      default:
        return this.leaderboardService.getGiftersRanking(period, +limit);
    }
  }
}
