import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsInt,
  IsObject,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PaymentProvider {
  CLICK = 'click',
  PAYME = 'payme',
  UZUM = 'uzum',
  GOOGLE = 'google',
}

export class InitiatePaymentDto {
  @ApiProperty({ enum: PaymentProvider })
  @IsEnum(PaymentProvider)
  provider: PaymentProvider;

  @ApiProperty({ example: 10000 })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ example: 'pkg_coins_100' })
  @IsString()
  packageId: string;
}

export class ClickPrepareDto {
  @IsInt()
  click_trans_id: number;

  @IsInt()
  service_id: number;

  @IsInt()
  click_paydoc_id: number;

  @IsString()
  merchant_trans_id: string;

  @IsNumber()
  amount: number;

  @IsInt()
  action: number;

  @IsInt()
  error: number;

  @IsString()
  error_note: string;

  @IsString()
  sign_time: string;

  @IsString()
  sign_string: string;
}

export class ClickCompleteDto extends ClickPrepareDto {
  @IsOptional()
  @IsString()
  merchant_prepare_id?: string;
}

export class PaymeDto {
  @ApiProperty({ example: 'CheckPerformTransaction' })
  @IsString()
  method: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  params?: any;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  id?: number;
}

export class GetTransactionHistoryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @IsOptional()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsInt()
  @IsOptional()
  @Min(1)
  limit?: number = 20;
}
