import { IsNumber, IsPositive, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class GetGiftsByPriceDto {
  @IsOptional()
  @IsNumber()
  @IsPositive({ message: 'Amount must be a positive number' })
  @Type(() => Number)
  amount?: number;
}

export interface GetGiftsByPriceResponse {
  success: boolean;
  amount: number;
  gifts: GiftItem[];
  count: number;
}

export interface GiftItem {
  address: string;
  name: string;
  collection: {
    address: string;
    name: string;
  };
  price: string;
  image: string;
  ownerAddress: string;
  actualOwnerAddress: string;
  /** URL lottie-анимации (из TonCenter metadata) */
  lottie?: string;
}
