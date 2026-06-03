import { IsString, IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ChatType } from '@prisma/client';

export class SendMessageDto {
  @IsString()
  receiverId: string;

  @IsString()
  content: string;

  @IsEnum(ChatType)
  @IsOptional()
  type?: ChatType = ChatType.TEXT;
}

export class GetMessagesDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 50;
}
