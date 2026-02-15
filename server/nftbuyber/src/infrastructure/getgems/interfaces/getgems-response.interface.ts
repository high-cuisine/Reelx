export interface GetGemsCollectionsResponse {
  success: boolean;
  response: {
    cursor: string | null;
    items: GiftCollection[];
  };
}

export interface GiftCollection {
  address: string;
  ownerAddress: string;
  name: string;
  description: string;
  image: string;
  imageSizes: {
    96?: string;
    352?: string;
  };
}

export interface GiftCollectionCache {
  collections: GiftCollection[];
  lastUpdated: number;
}

// NFT On Sale
export interface GetGemsNftsOnSaleResponse {
  success: boolean;
  response: {
    items: NftOnSale[];
  };
}

export interface NftOnSale {
  address: string;
  kind: string;
  collectionAddress: string;
  ownerAddress: string;
  actualOwnerAddress: string;
  image: string;
  imageSizes?: {
    96?: string;
    352?: string;
  };
  name: string;
  description: string;
  attributes?: Array<{
    traitType: string;
    value: string;
  }>;
  sale: {
    type: string;
    fullPrice: string; // в nanoTON
    currency: string;
    marketplaceFee?: string;
    marketplaceFeeAddress?: string;
    royaltyAddress?: string;
    royaltyAmount?: string;
    version?: string;
    contractType?: string;
    contractAddress?: string | null;
  };
  warning?: string | null;
}

export interface NftOnSaleData {
  nftAddress: string;
  collectionAddress: string;
  ownerAddress: string;
  actualOwnerAddress: string;
  image: string;
  name: string;
  description: string;
  priceInTon: number; // в TON
  fullPrice: string; // в nanoTON
  saleAddress?: string; // contractAddress из sale
  lastUpdated: number;
  /** URL lottie-анимации из TonCenter metadata (extra.lottie) */
  lottie?: string;
}

/** Листинг NFT только с контрактом продажи типа nft_sale_getgems_v4 (TonApi + фильтр) */
export interface GetGemsNftListing {
  nftAddress: string;
  saleContractAddress: string;
  ownerAddress: string;
  marketplace: 'getgems_v4';
  price: { amount: string; token: 'TON' };
  collection?: { name: string; address: string };
  metadata?: { name: string; image: string; description?: string };
  lastUpdated: Date;
}
