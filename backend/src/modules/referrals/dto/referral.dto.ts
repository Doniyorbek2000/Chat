import { IsString, IsOptional, IsNumber, IsBoolean, Min, Max } from 'class-validator';

export class ApplyReferralCodeDto {
  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsString()
  ipHash?: string;
}

export class CreateRebateRuleDto {
  @IsNumber()
  @Min(1)
  @Max(2)
  level: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  rebatePercent: number;

  @IsOptional()
  @IsNumber()
  minRechargeUSD?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateRebateRuleDto {
  @IsOptional()
  @IsNumber()
  rebatePercent?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
