import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsPositive,
  IsOptional,
  Min,
  Max,
} from 'class-validator';

export class SendGiftDto {
  @ApiProperty({ example: 'gift-cuid-123' })
  @IsString()
  giftId: string;

  @ApiProperty({ example: 'user-cuid-456' })
  @IsString()
  receiverId: string;

  @ApiPropertyOptional({ example: 'room-cuid-789' })
  @IsOptional()
  @IsString()
  roomId?: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsPositive()
  @Max(99)
  quantity: number;

  @ApiPropertyOptional({ example: 'You are amazing!' })
  @IsOptional()
  @IsString()
  message?: string;
}
