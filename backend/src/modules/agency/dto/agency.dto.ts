import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  Max,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateAgencyDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsNumber()
  @Min(0)
  @Max(30)
  commission: number;
}
