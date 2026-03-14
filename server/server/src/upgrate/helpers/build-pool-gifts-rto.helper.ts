import { PoolGiftRto } from '../rto/get-chance-response.rto';
import { priceToTon } from './price-to-ton.helper';
import type { NftBuyerGift } from '../types/nft-buyer-gift.type';

export function buildPoolGiftsRto(
  winGifts: NftBuyerGift[],
  loseGifts: NftBuyerGift[],
): PoolGiftRto[] {
  return [
    ...winGifts.map((g) => ({
      name: g?.name ?? 'Gift',
      image: g?.image,
      price: priceToTon(g?.price),
      pool: 'win' as const,
    })),
    ...loseGifts.map((g) => ({
      name: g?.name ?? 'Gift',
      image: g?.image,
      price: priceToTon(g?.price),
      pool: 'lose' as const,
    })),
  ];
}

