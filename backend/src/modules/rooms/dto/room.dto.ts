import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
  IsBoolean,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

export enum RoomTypeEnum {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  PASSWORD = 'PASSWORD',
  FAMILY = 'FAMILY',
  VIP = 'VIP',
}

export class CreateRoomDto {
  @ApiProperty({ example: 'Chill and Chat Room' })
  @IsString()
  @MaxLength(100)
  title: string;

  @ApiPropertyOptional({ example: 'A relaxing room for everyone' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ enum: RoomTypeEnum, default: 'PUBLIC' })
  @IsOptional()
  @IsEnum(RoomTypeEnum)
  type?: RoomTypeEnum;

  @ApiPropertyOptional({ example: 'secret123' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({ example: 8, minimum: 8, maximum: 16 })
  @IsOptional()
  @IsNumber()
  @Min(8)
  @Max(16)
  maxSeats?: number;

  @ApiPropertyOptional({ example: ['music', 'chill'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: 'UZ' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ example: 'uz' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  familyId?: string;
}

export class UpdateRoomDto {
  @ApiPropertyOptional({ example: 'Updated Room Title' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ enum: RoomTypeEnum })
  @IsOptional()
  @IsEnum(RoomTypeEnum)
  type?: RoomTypeEnum;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isLocked?: boolean;
}

export class TakeSeatDto {
  @ApiPropertyOptional({ example: 'enter_password' })
  @IsOptional()
  @IsString()
  password?: string;
}

export class JoinRoomDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  password?: string;
}

export class AnnouncementDto {
  @ApiProperty({ example: 'Welcome to our room!' })
  @IsString()
  @MaxLength(500)
  announcement: string;
}

export class InviteToSeatDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty({ example: 3 })
  @IsNumber()
  @Min(1)
  @Max(16)
  position: number;
}
