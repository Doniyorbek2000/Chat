import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GreedyService } from './greedy.service';
import { PlaceBetDto } from './dto/greedy.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Greedy Game')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('greedy')
export class GreedyController {
  constructor(private readonly greedyService: GreedyService) {}

  @Get('state')
  @ApiOperation({ summary: 'Current round state, my bets, and my balance' })
  async getState(@CurrentUser('id') userId: string) {
    return this.greedyService.getState(userId);
  }

  @Post('bet')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Place a bet on an item in the current round' })
  async placeBet(@CurrentUser('id') userId: string, @Body() dto: PlaceBetDto) {
    return this.greedyService.placeBet(userId, dto.item, dto.amount);
  }

  @Get('history')
  @ApiOperation({ summary: 'Recent round results' })
  async getHistory() {
    return this.greedyService.getLastResults(30);
  }

  @Get('me/history')
  @ApiOperation({ summary: 'My recent bets and outcomes' })
  async getMyHistory(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.greedyService.getMyHistory(
      userId,
      parseInt(page, 10) || 1,
      Math.min(parseInt(limit, 10) || 20, 100),
    );
  }
}
