import { IsEnum, IsInt, IsNumber, IsPositive, Min, Max } from 'class-validator';
import { GameCurrancy } from '@prisma/client';

export class CreateTableDto {
  @IsEnum(GameCurrancy)
  currency: GameCurrancy;

  @IsNumber()
  @IsPositive()
  betAmount: number;

  @IsInt()
  @Min(2)
  @Max(10)
  maxPlayers: number;
}
