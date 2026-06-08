/**
 * Ответы TonApi.io (v2).
 * Документация: https://docs.tonconsole.com/tonapi/rest-api/nft
 */

export interface TonApiSale {
  address?: string;
  market?: { address?: string; name?: string; icon?: string };
  owner?: { address?: string };
  price?: { token_name?: string; value?: string; amount?: string; token?: string };
  [key: string]: unknown;
}

export interface TonApiNftItem {
  address: string;
  owner?: { address: string };
  collection?: { address: string; name?: string };
  metadata?: { name?: string; image?: string; description?: string; attributes?: Array<{ trait_type?: string; value?: string }> };
  previews?: Array<{ resolution?: string; url: string }>;
  sale?: TonApiSale;
  [key: string]: unknown;
}

/** GET /v2/nfts/{address} — детали одного NFT */
export interface TonApiNftDetailsResponse extends TonApiNftItem {}

/** GET /v2/accounts/{address}/nfts — список NFT аккаунта */
export interface TonApiAccountNftsResponse {
  nft_items?: TonApiNftItem[];
  [key: string]: unknown;
}

/** GET /v2/nfts/collections/{account_id} — данные коллекции */
export interface TonApiCollectionResponse {
  address: string;
  owner?: { address: string };
  last_activity?: number;
  metadata?: { name?: string; description?: string; image?: string; [key: string]: unknown };
  previews?: Array<{ resolution?: string; url: string }>;
  approvedBy?: string[];
  [key: string]: unknown;
}

/** GET /v2/nfts/collections/{account_id}/items — предметы коллекции */
export interface TonApiCollectionItemsResponse {
  nft_items: TonApiNftItem[];
}
