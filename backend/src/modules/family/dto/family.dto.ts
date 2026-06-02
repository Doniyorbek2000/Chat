import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEnum,
  Min,
  MaxLength,
  Length,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { FamilyMemberRole } from '@prisma/client';

export class CreateFamilyDto {
  @ApiProperty({ example: 'Dream Warriors', description: 'Family name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @ApiProperty({ example: 'DW', description: 'Short tag (max 8 chars)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(8)
  tag: string;

  @ApiPropertyOptional({ example: 'A family for champions' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  requireApproval?: boolean;

  @ApiPropertyOptional({ example: 'UZ' })
  @IsOptional()
  @IsString()
  country?: string;
}

export class UpdateFamilyDto extends PartialType(CreateFamilyDto) {}

export class DonateTreasuryDto {
  @ApiProperty({ example: 100, description: 'Amount of diamonds to donate (min 10)' })
  @IsNumber()
  @Min(10)
  amount: number;
}

export class PromoteMemberDto {
  @ApiProperty({
    enum: [FamilyMemberRole.CO_OWNER, FamilyMemberRole.ADMIN, FamilyMemberRole.MEMBER],
    description: 'New role to assign',
  })
  @IsEnum([FamilyMemberRole.CO_OWNER, FamilyMemberRole.ADMIN, FamilyMemberRole.MEMBER])
  role: FamilyMemberRole;
}
