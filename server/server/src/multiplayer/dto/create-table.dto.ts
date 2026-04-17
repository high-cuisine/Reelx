import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsPositive, Min, Max } from 'class-validator';
import { GameCurrancy } from '@prisma/client';

export class CreateTableDto {
  @Transform(({ value }) => {
    const v = typeof value === 'string' ? value.trim().toUpperCase() : value;
    if (v === 'STAR') return GameCurrancy.STARS;
    return v;
  })
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
