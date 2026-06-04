import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UnlockMedalDto {
  @IsString()
  medalId: string;
}

export class EquipMedalDto {
  @IsString()
  medalId: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(8)
  @Type(() => Number)
  slot?: number;
}

export class SetMedalWallDto {
  @IsNumber()
  @Min(0)
  @Max(8)
  @Type(() => Number)
  slotIndex: number;

  @IsOptional()
  @IsString()
  medalId?: string;
}
