import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PkBattleService } from './pk-battle.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IsString, IsNumber, IsPositive, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ChallengeRoomDto {
  @ApiProperty()
  @IsString()
  myRoomId: string;

  @ApiProperty()
  @IsString()
  defenderRoomId: string;
}

class UpdateScoreDto {
  @ApiProperty()
  @IsNumber()
  @IsPositive()
  score: number;
}

@ApiTags('PK Battle')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pk-battle')
export class PkBattleController {
  constructor(private readonly pkBattleService: PkBattleService) {}

  @Post('challenge')
  @ApiOperation({ summary: 'Challenge a room to PK battle' })
  challengeRoom(
    @CurrentUser('id') userId: string,
    @Body() dto: ChallengeRoomDto,
  ) {
    return this.pkBattleService.challengeRoom(userId, dto.myRoomId, dto.defenderRoomId);
  }

  @Post(':id/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept PK battle challenge' })
  acceptChallenge(
    @CurrentUser('id') userId: string,
    @Param('id') battleId: string,
  ) {
    return this.pkBattleService.acceptChallenge(userId, battleId);
  }

  @Post(':id/end')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'End PK battle' })
  endBattle(@Param('id') battleId: string) {
    return this.pkBattleService.endBattle(battleId);
  }

  @Post(':id/score')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update PK battle score' })
  updateScore(
    @Param('id') battleId: string,
    @Query('roomId') roomId: string,
    @Body() dto: UpdateScoreDto,
  ) {
    return this.pkBattleService.updateScore(battleId, roomId, dto.score);
  }

  @Get('room/:roomId')
  @ApiOperation({ summary: 'Get active battle for a room' })
  getActiveBattle(@Param('roomId') roomId: string) {
    return this.pkBattleService.getActiveBattle(roomId);
  }

  @Get('history/:roomId')
  @ApiOperation({ summary: 'Get PK battle history for a room' })
  getPkHistory(
    @Param('roomId') roomId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.pkBattleService.getPkHistory(roomId, +page, +limit);
  }
}
