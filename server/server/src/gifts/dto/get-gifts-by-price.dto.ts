import { Type } from 'class-transformer';
import { IsOptional, IsNumber, IsIn, IsString } from 'class-validator';

export class GetGiftsByPriceDto {
  @Type(() => Number)
  @IsNumber()
  amount: number;

  @IsString()
  @IsIn(['ton', 'stars'])
  type: 'ton' | 'stars';
}
