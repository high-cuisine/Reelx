import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { GiftCollection } from './interfaces/getgems-response.interface';

interface GraphQlResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

interface GiftCollectionsData {
  giftCollections?: {
    cursor?: string | null;
    items?: Array<{
      address?: string;
      ownerAddress?: string;
      owner?: { address?: string };
      name?: string;
      description?: string;
      image?: string;
      avatarImage?: { url?: string };
      coverImage?: { url?: string };
      cover?: { url?: string };
      socialLinks?: { image?: string };
      imageSizes?: { w96?: string; w352?: string; [key: string]: unknown };
    }>;
  };
}

/** Запросы в порядке убывания вероятности совпадения со схемой */
const CANDIDATE_QUERIES = [
  `query GiftCollections($first: Int!, $after: String) {
    giftCollections(first: $first, after: $after) {
      cursor
      items {
        address ownerAddress name description image
        imageSizes { w96 w352 }
      }
    }
  }`,
  `query GiftCollections($first: Int!, $after: String) {
    giftCollections(first: $first, after: $after) {
      cursor
      items {
        address
        owner { address }
        name description image
      }
    }
  }`,
  `query GiftCollections($first: Int!, $after: String) {
    giftCollections(first: $first, after: $after) {
      cursor
      items {
        address ownerAddress name description
        avatarImage { url }
        coverImage { url }
      }
    }
  }`,
];

@Injectable()
export class GetGemsGraphQlClient {
  private readonly logger = new Logger(GetGemsGraphQlClient.name);
  private readonly api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: 'https://api.getgems.io',
      timeout: 20000,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
  }

  async getAllGiftCollections(): Promise<GiftCollection[]> {
    for (const query of CANDIDATE_QUERIES) {
      try {
        const collections = await this.fetchWithQuery(query);
        if (collections.length > 0) {
          this.logger.log(`Fetched ${collections.length} gift collections via GetGems GraphQL`);
          return collections;
        }
      } catch (error) {
        this.logger.debug(`GraphQL query variant failed: ${error.message}`);
      }
    }
    this.logger.warn('All GetGems GraphQL query variants failed; will use fallback');
    return [];
  }

  private async fetchWithQuery(query: string): Promise<GiftCollection[]> {
    const limit = 50;
    const maxTotal = 300;
    const all: GiftCollection[] = [];
    let after: string | undefined;

    while (all.length < maxTotal) {
      const resp = await this.api.post<GraphQlResponse<GiftCollectionsData>>('/graphql', {
        query,
        variables: { first: limit, after: after ?? null },
      });

      const errors = resp.data?.errors;
      if (errors?.length) {
        throw new Error(errors.map((e) => e.message).join('; '));
      }

      const page = resp.data?.data?.giftCollections;
      if (!page?.items?.length) break;

      for (const item of page.items) {
        if (!item.address) continue;

        const image =
          item.image ??
          item.avatarImage?.url ??
          item.coverImage?.url ??
          item.cover?.url ??
          item.socialLinks?.image ??
          '';

        const preview96 = item.imageSizes?.w96 ?? '';
        const preview352 = item.imageSizes?.w352 ?? '';

        all.push({
          address: item.address,
          ownerAddress: item.ownerAddress ?? item.owner?.address ?? '',
          name: item.name ?? '',
          description: item.description ?? '',
          image,
          imageSizes: {
            ...(preview96 ? { 96: preview96 } : {}),
            ...(preview352 ? { 352: preview352 } : {}),
          },
        });
      }

      after = page.cursor ?? undefined;
      if (!after) break;
      await new Promise((r) => setTimeout(r, 300));
    }

    return all;
  }
}
