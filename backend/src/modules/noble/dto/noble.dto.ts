import {
  IsString,
  IsOptional,
  IsNumber,
  IsPositive,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PurchaseNobleDto {
  @IsString()
  planId: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  months: number = 1;
}

export class SendNobleDto {
  @IsString()
  planId: string;

  @IsString()
  receiverId: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  months: number = 1;

  @IsOptional()
  @IsString()
  message?: string;
}
