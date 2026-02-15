export interface NftCollectionDto {
  address: string;
  name: string;
}

export interface NftAttributeDto {
  trait_type: string;
  value: string | number;
}

export interface NftMediaDto {
  image: string;
  raw_image: string;
  /** URL to Lottie animation (from TonCenter metadata) */
  lottie?: string;
}

export interface NftMetadataDto {
  name?: string;
  description?: string;
  attributes?: NftAttributeDto[];
  [key: string]: any;
}

export interface NftSourcesDto {
  marketplace: boolean;
  onchain: boolean;
  metadata: boolean;
}

export interface NftResponseDto {
  address: string;
  name: string;
  collection: NftCollectionDto;
  status: 'for_sale' | 'not_for_sale';
  price: string;
  attributes: NftAttributeDto[];
  media: NftMediaDto;
  metadata: NftMetadataDto;
  sources: NftSourcesDto;
}

