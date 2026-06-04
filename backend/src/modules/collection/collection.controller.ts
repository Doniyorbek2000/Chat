import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CollectionService } from './collection.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ShopCategory, AssetGrade } from '@prisma/client';

@ApiTags('collection')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('collection')
export class CollectionController {
  constructor(private readonly collectionService: CollectionService) {}

  @Get('me')
  getMyCollection(@CurrentUser('id') userId: string) {
    return this.collectionService.getMyCollection(userId);
  }

  @Get('assets')
  getAssets(
    @CurrentUser('id') userId: string,
    @Query('category') category?: ShopCategory,
    @Query('grade') grade?: AssetGrade,
  ) {
    return this.collectionService.getAssets(userId, category, grade);
  }
}
