import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { HomeService } from './home.service';

@ApiTags('Home')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('home')
export class HomeController {
  constructor(private readonly svc: HomeService) {}

  @Get('summary')
  getSummary(@CurrentUser('id') userId: string) {
    return this.svc.getSummary(userId);
  }

  @Get('banners')
  getBanners(@Query('placement') placement?: string, @Query('country') country?: string) {
    return this.svc.getBanners(placement, country);
  }

  @Get('categories')
  getCategories() {
    return this.svc.getCategories();
  }
}
