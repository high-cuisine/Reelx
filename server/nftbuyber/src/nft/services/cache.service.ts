import { Injectable, Logger } from '@nestjs/common';
import { NftResponseDto } from '../dto/nft-response.dto';

interface CacheEntry {
  data: NftResponseDto;
  timestamp: number;
  ttl: number; // в миллисекундах
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly defaultTtl = 5 * 60 * 1000; // 5 минут по умолчанию

  constructor() {
    this.cleanup();
  }

  get(key: string): NftResponseDto | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set(key: string, data: NftResponseDto, ttl?: number): void {
    const now = Date.now();
    const cacheTtl = ttl || this.defaultTtl;
    
    this.cache.set(key, {
      data,
      timestamp: now,
      ttl: cacheTtl,
    });

    this.logger.debug(`Cached NFT data for ${key} with TTL ${cacheTtl}ms`);
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Периодическая очистка устаревших записей
  cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired cache entries`);
    }
  }
}

