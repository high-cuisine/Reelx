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
    fullPrice: string;
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
  priceInTon: number;
  fullPrice: string;
  saleAddress?: string;
  lastUpdated: number;
  lottie?: string;
}
