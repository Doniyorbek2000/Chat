import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsInt, Min, Max } from 'class-validator';
import { GREEDY_MIN_BET, GREEDY_MAX_BET } from '../greedy.config';

export class PlaceBetDto {
  @ApiProperty({ example: 'pizza', description: 'Item key to bet on' })
  @IsString()
  @IsNotEmpty()
  item: string;

  @ApiProperty({ example: 1000, minimum: GREEDY_MIN_BET, maximum: GREEDY_MAX_BET })
  @IsInt()
  @Min(GREEDY_MIN_BET)
  @Max(GREEDY_MAX_BET)
  amount: number;
}
