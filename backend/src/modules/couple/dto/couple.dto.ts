import { IsOptional, IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class SendCoupleRequestDto {
  @ApiPropertyOptional({
    example: 'Would you be my partner?',
    description: 'Optional message with request',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  message?: string;
}

export class EndCoupleDto {
  @ApiProperty({
    example: 'We both agreed to end this',
    description: 'Reason for ending the couple',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}
