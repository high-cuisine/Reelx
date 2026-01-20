import { IsNumber, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class DepositTonDto {
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount: number;
}
