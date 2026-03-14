import type { NftBuyerGift } from './nft-buyer-gift.type';

export type UpgrateState = {
  winGifts: NftBuyerGift[];
  chance: number;
  bet: number;
  loseGifts: NftBuyerGift[];
  /** name выбранного NFT из win-пула */
  wishNft: string | null;
};

