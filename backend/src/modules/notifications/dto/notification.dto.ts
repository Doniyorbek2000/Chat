import {
  IsString,
  IsOptional,
  IsObject,
  IsInt,
  Min,
  Max,
} from 'class-validator';

export class CreateNotificationDto {
  @IsString()
  userId: string;

  @IsString()
  type: string;

  @IsString()
  title: string;

  @IsString()
  body: string;

  @IsObject()
  @IsOptional()
  data?: Record<string, any>;
}

export class GetNotificationsDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}
