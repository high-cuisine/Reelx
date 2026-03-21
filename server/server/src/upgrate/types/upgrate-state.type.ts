import type { NftBuyerGift } from './nft-buyer-gift.type';

export type UpgrateState = {
  toyIds: string[];
  winGifts: NftBuyerGift[];
  chance: number;
  bet: number;
  loseGifts: NftBuyerGift[];
  /** Имена NFT из win-пула; пусто — приз при выигрыше подбирается автоматически */
  wishNfts: string[];
};

