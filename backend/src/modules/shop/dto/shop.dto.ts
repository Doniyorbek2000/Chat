import { IsString, IsOptional } from 'class-validator';

export class BuyItemDto {
  @IsString()
  itemId: string;
}

export class SendItemDto {
  @IsString()
  itemId: string;

  @IsString()
  receiverId: string;

  @IsOptional()
  @IsString()
  message?: string;
}
