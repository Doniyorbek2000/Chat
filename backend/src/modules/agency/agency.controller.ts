import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AgencyService } from './agency.service';
import { CreateAgencyDto } from './dto/agency.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('agencies')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('agencies')
export class AgencyController {
  constructor(private agencyService: AgencyService) {}

  @Post()
  createAgency(@CurrentUser() user: any, @Body() dto: CreateAgencyDto) {
    return this.agencyService.createAgency(user.id, dto);
  }

  @Get()
  getAgencies(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.agencyService.getAgencies(+page, +limit);
  }

  @Get('ranking')
  getAgencyRanking() {
    return this.agencyService.getAgencyRanking();
  }

  @Get(':id')
  getAgency(@Param('id') id: string) {
    return this.agencyService.getAgency(id);
  }

  @Post(':id/join')
  joinAgency(@CurrentUser() user: any, @Param('id') id: string) {
    return this.agencyService.joinAgency(user.id, id);
  }

  @Post(':id/leave')
  leaveAgency(@CurrentUser() user: any, @Param('id') id: string) {
    return this.agencyService.leaveAgency(user.id, id);
  }

  @Get(':id/stats')
  getAgencyStats(@Param('id') id: string) {
    return this.agencyService.getAgencyStats(id);
  }
}
