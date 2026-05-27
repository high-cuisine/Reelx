import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { ScheduleModule } from '@nestjs/schedule';
import { NftModule } from './nft/nft.module';
import { InfrastructureModule } from './infrastructure/infrastructure.module';

const envFilePaths = [
  resolve(process.cwd(), '../.env'),
  resolve(process.cwd(), '.env'),
].filter((path) => existsSync(path));

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: envFilePaths.length ? envFilePaths : undefined,
    }),
    ScheduleModule.forRoot(),
    InfrastructureModule,
    NftModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}

