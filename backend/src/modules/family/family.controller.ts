import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { FamilyService } from './family.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsPositive,
  MaxLength,
  Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FamilyMemberRole } from '@prisma/client';

class CreateFamilyDto {
  @ApiProperty({ example: 'Dream Warriors' })
  @IsString()
  @MaxLength(50)
  name: string;

  @ApiProperty({ example: 'DW', description: '2-5 character tag' })
  @IsString()
  @Length(2, 5)
  tag: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  requireApproval?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country?: string;
}

class DonateDto {
  @ApiProperty({ example: 100 })
  @IsNumber()
  @IsPositive()
  amount: number;
}

class PromoteDto {
  @ApiProperty({ enum: FamilyMemberRole })
  role: FamilyMemberRole;
}

@ApiTags('Families')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('families')
export class FamilyController {
  constructor(private readonly familyService: FamilyService) {}

  @Post()
  @ApiOperation({ summary: 'Create a family' })
  createFamily(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateFamilyDto,
  ) {
    return this.familyService.createFamily(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all families' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'country', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getFamilies(
    @Query('search') search?: string,
    @Query('country') country?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.familyService.getFamilies({ search, country, page: +page, limit: +limit });
  }

  @Get('ranking')
  @ApiOperation({ summary: 'Get family rankings' })
  @ApiQuery({ name: 'period', required: false, enum: ['daily', 'weekly', 'monthly'] })
  getFamilyRanking(@Query('period') period: any = 'weekly') {
    return this.familyService.getFamilyRanking(period);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get family by ID' })
  getFamily(@Param('id') familyId: string) {
    return this.familyService.getFamily(familyId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update family info' })
  updateFamily(
    @CurrentUser('id') userId: string,
    @Param('id') familyId: string,
    @Body() data: any,
  ) {
    return this.familyService.updateFamily(userId, familyId, data);
  }

  @Post(':id/join')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Join a family' })
  joinFamily(
    @CurrentUser('id') userId: string,
    @Param('id') familyId: string,
  ) {
    return this.familyService.joinFamily(userId, familyId);
  }

  @Post(':id/leave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Leave a family' })
  leaveFamily(
    @CurrentUser('id') userId: string,
    @Param('id') familyId: string,
  ) {
    return this.familyService.leaveFamily(userId, familyId);
  }

  @Post(':id/invite')
  @ApiOperation({ summary: 'Invite a member' })
  inviteMember(
    @CurrentUser('id') userId: string,
    @Param('id') familyId: string,
    @Body('targetUserId') targetUserId: string,
  ) {
    return this.familyService.inviteMember(userId, familyId, targetUserId);
  }

  @Post(':id/members/:userId/promote')
  @ApiOperation({ summary: 'Promote/demote a member' })
  promoteMember(
    @CurrentUser('id') adminId: string,
    @Param('id') familyId: string,
    @Param('userId') targetUserId: string,
    @Body() dto: PromoteDto,
  ) {
    return this.familyService.promoteMember(adminId, familyId, targetUserId, dto.role);
  }

  @Post(':id/members/:userId/kick')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Kick a member from family' })
  kickMember(
    @CurrentUser('id') adminId: string,
    @Param('id') familyId: string,
    @Param('userId') targetUserId: string,
  ) {
    return this.familyService.kickMember(adminId, familyId, targetUserId);
  }

  @Post(':id/donate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Donate to family treasury' })
  donateToTreasury(
    @CurrentUser('id') userId: string,
    @Param('id') familyId: string,
    @Body() dto: DonateDto,
  ) {
    return this.familyService.donateToTreasury(userId, familyId, dto.amount);
  }

  @Get(':id/battles')
  @ApiOperation({ summary: 'Get family battles' })
  getFamilyBattles(@Param('id') familyId: string) {
    return this.familyService.getFamilyBattles(familyId);
  }
}
