import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsInt,
  IsObject,
} from 'class-validator';

export enum PaymentProvider {
  CLICK = 'click',
  PAYME = 'payme',
  UZUM = 'uzum',
  GOOGLE = 'google',
}

export class InitiatePaymentDto {
  @IsEnum(PaymentProvider)
  provider: PaymentProvider;

  @IsNumber()
  amount: number;

  @IsString()
  packageId: string;
}

export class ClickPrepareDto {
  click_trans_id: number;
  service_id: number;
  click_paydoc_id: number;
  merchant_trans_id: string;
  amount: number;
  action: number;
  error: number;
  error_note: string;
  sign_time: string;
  sign_string: string;
}

export class ClickCompleteDto extends ClickPrepareDto {
  merchant_prepare_id?: string;
}

export class PaymeDto {
  @IsString()
  method: string;

  @IsObject()
  @IsOptional()
  params?: any;

  @IsInt()
  @IsOptional()
  id?: number;
}

export class GetTransactionHistoryDto {
  @IsInt()
  @IsOptional()
  page?: number = 1;

  @IsInt()
  @IsOptional()
  limit?: number = 20;
}
