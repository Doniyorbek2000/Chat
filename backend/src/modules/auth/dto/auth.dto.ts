import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsPhoneNumber,
  Length,
  IsNotEmpty,
  IsEmail,
} from 'class-validator';

export class SendOtpDto {
  @ApiProperty({ example: '+998901234567' })
  @IsString()
  @IsNotEmpty()
  phone: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '+998901234567' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(4, 6)
  otp: string;

  @ApiPropertyOptional({ example: 'device-uuid-123' })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({ example: 'REF001' })
  @IsOptional()
  @IsString()
  referralCode?: string;
}

export class GoogleAuthDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  idToken: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  referralCode?: string;
}

export class AppleAuthDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  identityToken: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  authorizationCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  givenName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  familyName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class GuestLoginDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceId?: string;
}
