import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MaxLength,
  IsUrl,
  IsBoolean,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'johndoe' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  username?: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  displayName?: string;

  @ApiPropertyOptional({ example: 'Hello, I am John!' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  bio?: string;

  @ApiPropertyOptional({ example: 'UZ' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: 'uz' })
  @IsOptional()
  @IsString()
  language?: string;
}

export class UpdateFcmTokenDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fcmToken?: string;
}
