import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsUrl,
  IsDateString,
  Min,
  Max,
  IsInt,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GiftCategory, GiftType } from '@prisma/client';

export class BanUserDto {
  @ApiProperty({ example: 'Spamming' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ example: '2025-12-31T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  bannedUntil?: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  isPermanent: boolean;
}

export class CreateGiftDto {
  @ApiProperty({ example: 'Rose' })
  @IsString()
  name: string;

  @ApiProperty({ enum: GiftCategory })
  @IsEnum(GiftCategory)
  category: GiftCategory;

  @ApiProperty({ enum: GiftType })
  @IsEnum(GiftType)
  type: GiftType;

  @ApiProperty({ example: 'https://cdn.voxo.app/gifts/rose.png' })
  @IsString()
  imageUrl: string;

  @ApiPropertyOptional({ example: 'https://cdn.voxo.app/gifts/rose.json' })
  @IsOptional()
  @IsString()
  animationUrl?: string;

  @ApiProperty({ example: 100 })
  @IsInt()
  @Min(0)
  coinPrice: number;

  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  diamondPrice: number;

  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  sortOrder: number;
}

export class UpdateGiftDto {
  @ApiPropertyOptional({ example: 'Golden Rose' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: GiftCategory })
  @IsOptional()
  @IsEnum(GiftCategory)
  category?: GiftCategory;

  @ApiPropertyOptional({ enum: GiftType })
  @IsOptional()
  @IsEnum(GiftType)
  type?: GiftType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  animationUrl?: string;

  @ApiPropertyOptional({ example: 200 })
  @IsOptional()
  @IsInt()
  @Min(0)
  coinPrice?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  diamondPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class RejectWithdrawalDto {
  @ApiProperty({ example: 'Insufficient documentation' })
  @IsString()
  reason: string;
}

export class BroadcastDto {
  @ApiProperty({ example: 'Server maintenance' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Planned downtime at 3 AM UTC' })
  @IsString()
  body: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({ example: 'Hello world' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ example: 'ADMIN' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;
}
