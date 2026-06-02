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
import { GiftCategory, GiftType } from '@prisma/client';

export class BanUserDto {
  @IsString()
  reason: string;

  @IsOptional()
  @IsDateString()
  bannedUntil?: string;

  @IsBoolean()
  isPermanent: boolean;
}

export class CreateGiftDto {
  @IsString()
  name: string;

  @IsEnum(GiftCategory)
  category: GiftCategory;

  @IsEnum(GiftType)
  type: GiftType;

  @IsString()
  imageUrl: string;

  @IsOptional()
  @IsString()
  animationUrl?: string;

  @IsInt()
  @Min(0)
  coinPrice: number;

  @IsInt()
  @Min(0)
  diamondPrice: number;

  @IsInt()
  @Min(0)
  sortOrder: number;
}

export class UpdateGiftDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(GiftCategory)
  category?: GiftCategory;

  @IsOptional()
  @IsEnum(GiftType)
  type?: GiftType;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  animationUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  coinPrice?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  diamondPrice?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class RejectWithdrawalDto {
  @IsString()
  reason: string;
}

export class BroadcastDto {
  @IsString()
  title: string;

  @IsString()
  body: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;
}
