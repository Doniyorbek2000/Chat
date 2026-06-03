import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('events')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('events')
export class EventsController {
  constructor(private eventsService: EventsService) {}

  @Get()
  getEvents(@Query('status') status?: string) {
    if (status === 'upcoming') return this.eventsService.getUpcomingEvents();
    if (status === 'completed') return this.eventsService.getCompletedEvents();
    return this.eventsService.getActiveEvents();
  }

  @Get(':id')
  getEvent(@Param('id') id: string) {
    return this.eventsService.getEvent(id);
  }

  @Post(':id/join')
  joinEvent(@CurrentUser() user: any, @Param('id') id: string) {
    return this.eventsService.claimEventReward(user.id, id);
  }

  @Get(':id/leaderboard')
  getEventLeaderboard(
    @Param('id') id: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return this.eventsService.getEventLeaderboard(id, +page, +limit);
  }

  @Post(':id/claim-reward')
  claimReward(@CurrentUser() user: any, @Param('id') id: string) {
    return this.eventsService.claimEventReward(user.id, id);
  }
}
