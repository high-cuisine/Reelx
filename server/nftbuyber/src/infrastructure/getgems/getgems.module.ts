import { Module, forwardRef } from '@nestjs/common';
import { FragmentClient } from './fragment.client';
import { GiftsSyncService } from './gifts-sync.service';
import { NftsSyncService } from './nfts-sync.service';
import { TonCenterClient } from './toncenter.client';
import { RedisModule } from '../redis/redis.module';
import { TonApiModule } from '../tonapi/tonapi.module';
import { NftModule } from '../../nft/nft.module';

@Module({
  imports: [RedisModule, TonApiModule, forwardRef(() => NftModule)],
  providers: [FragmentClient, GiftsSyncService, NftsSyncService, TonCenterClient],
  exports: [GiftsSyncService, NftsSyncService],
})
export class GetGemsModule {}
