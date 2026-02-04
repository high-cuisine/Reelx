import { Module, forwardRef } from '@nestjs/common';
import { GetGemsApiClient } from './getgems-api.client';
import { GiftsSyncService } from './gifts-sync.service';
import { NftsSyncService } from './nfts-sync.service';
import { RedisModule } from '../redis/redis.module';
import { TonApiModule } from '../tonapi/tonapi.module';
import { NftModule } from '../../nft/nft.module';

@Module({
  imports: [RedisModule, TonApiModule, forwardRef(() => NftModule)],
  providers: [GetGemsApiClient, GiftsSyncService, NftsSyncService],
  exports: [GetGemsApiClient, GiftsSyncService, NftsSyncService],
})
export class GetGemsModule {}
