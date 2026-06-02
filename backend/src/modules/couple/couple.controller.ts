import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CoupleService } from './couple.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class SendCoupleRequestDto {
  @ApiProperty()
  @IsString()
  receiverId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  message?: string;
}

class EndCoupleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

@ApiTags('Couples')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('couples')
export class CoupleController {
  constructor(private readonly coupleService: CoupleService) {}

  @Post('request')
  @ApiOperation({ summary: 'Send couple request' })
  sendRequest(
    @CurrentUser('id') userId: string,
    @Body() dto: SendCoupleRequestDto,
  ) {
    return this.coupleService.sendCoupleRequest(userId, dto.receiverId, dto.message);
  }

  @Post('request/:id/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept couple request' })
  acceptRequest(
    @CurrentUser('id') userId: string,
    @Param('id') requestId: string,
  ) {
    return this.coupleService.acceptRequest(userId, requestId);
  }

  @Post('request/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject couple request' })
  rejectRequest(
    @CurrentUser('id') userId: string,
    @Param('id') requestId: string,
  ) {
    return this.coupleService.rejectRequest(userId, requestId);
  }

  @Get('requests')
  @ApiOperation({ summary: 'Get pending couple requests' })
  getPendingRequests(@CurrentUser('id') userId: string) {
    return this.coupleService.getPendingRequests(userId);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get my couple info' })
  getCoupleInfo(@CurrentUser('id') userId: string) {
    return this.coupleService.getCoupleInfo(userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'End couple relationship' })
  endCouple(
    @CurrentUser('id') userId: string,
    @Param('id') coupleId: string,
    @Body() dto: EndCoupleDto,
  ) {
    return this.coupleService.endCouple(userId, coupleId, dto.reason);
  }

  @Get('ranking')
  @ApiOperation({ summary: 'Get couple rankings' })
  getCoupleRanking() {
    return this.coupleService.getCoupleRanking();
  }

  @Get(':id/gifts')
  @ApiOperation({ summary: 'Get couple gift history' })
  getCoupleGifts(@Param('id') coupleId: string) {
    return this.coupleService.getCoupleGifts(coupleId);
  }
}
