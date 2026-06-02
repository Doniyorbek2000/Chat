import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsPositive,
  IsOptional,
  IsEnum,
  Min,
} from 'class-validator';

export enum WithdrawalMethodEnum {
  CLICK = 'CLICK',
  PAYME = 'PAYME',
  BANK = 'BANK',
  UZUM = 'UZUM',
}

export class TransferDto {
  @ApiProperty({ example: 'VOXO12345678' })
  @IsString()
  receiverUid: string;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiPropertyOptional({ example: 'Gift for you!' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class RechargeClickDto {
  @ApiProperty({ example: 50000 })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ example: 'click_transaction_id' })
  @IsString()
  transactionId: string;

  @ApiProperty({ example: 'click_sign_string' })
  @IsString()
  signString: string;
}

export class RechargePaymeDto {
  @ApiProperty({ example: 50000 })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ example: 'payme_transaction_id' })
  @IsString()
  transactionId: string;
}

export class WithdrawDto {
  @ApiProperty({ example: 10000 })
  @IsNumber()
  @IsPositive()
  @Min(5000)
  amount: number;

  @ApiProperty({ enum: WithdrawalMethodEnum })
  @IsEnum(WithdrawalMethodEnum)
  method: WithdrawalMethodEnum;

  @ApiProperty({ example: '+998901234567' })
  @IsString()
  accountNumber: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  accountName: string;
}
