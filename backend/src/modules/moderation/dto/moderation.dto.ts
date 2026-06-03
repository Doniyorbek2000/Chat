import {
  IsString,
  IsEnum,
  IsOptional,
  IsInt,
  IsBoolean,
  Min,
} from 'class-validator';
import { ReportTargetType, ReportStatus, BanType } from '@prisma/client';

export class ReportUserDto {
  @IsString()
  targetId: string;

  @IsEnum(ReportTargetType)
  targetType: ReportTargetType;

  @IsString()
  reason: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class BanUserDto {
  @IsString()
  userId: string;

  @IsEnum(BanType)
  type: BanType;

  @IsString()
  reason: string;

  @IsInt()
  @IsOptional()
  durationHours?: number;

  @IsBoolean()
  @IsOptional()
  isPermanent?: boolean = false;

  @IsString()
  @IsOptional()
  roomId?: string;
}

export class MuteUserDto {
  @IsString()
  userId: string;

  @IsString()
  @IsOptional()
  roomId?: string;

  @IsInt()
  @Min(1)
  durationSeconds: number;
}

export class ResolveReportDto {
  @IsEnum(['REVIEWING', 'RESOLVED', 'DISMISSED'])
  action: 'REVIEWING' | 'RESOLVED' | 'DISMISSED';

  @IsString()
  @IsOptional()
  notes?: string;
}

export class GetReportsDto {
  @IsEnum(ReportStatus)
  @IsOptional()
  status?: ReportStatus;

  @IsInt()
  @IsOptional()
  page?: number = 1;

  @IsInt()
  @IsOptional()
  limit?: number = 20;
}
