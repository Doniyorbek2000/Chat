import { IsString, IsOptional, IsDateString, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEventDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() type?: string;
  @ApiProperty() @IsDateString() startDate: string;
  @ApiProperty() @IsDateString() endDate: string;
  @ApiPropertyOptional() @IsOptional() @IsString() banner?: string;
  @ApiPropertyOptional() @IsOptional() rewards?: Record<string, any>;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
