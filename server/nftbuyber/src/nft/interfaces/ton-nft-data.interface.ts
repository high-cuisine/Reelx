import { Cell, Address } from 'ton-core';

/** Token info from TonCenter API v3 metadata (e.g. extra.lottie) */
export interface TonCenterTokenExtra {
  lottie?: string;
  [key: string]: unknown;
}

export interface TonNftData {
  init: boolean;
  index: bigint;
  collection: Address | null;
  owner: Address | null;
  individualContent: Cell | null;
  contentUri?: string; // URI из API v3
  /** Pre-indexed metadata from TonCenter (e.g. token_info[0].extra) */
  tonCenterExtra?: TonCenterTokenExtra;
}

export interface ParsedContentUrl {
  url: string;
  type: 'ipfs' | 'https' | 'unknown';
}

