import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { UsersModule } from './users/users.module';
import { GiftsModule } from './gifts/gifts.module';
import { PromocodeModule } from './promocode/promocode.module';
import { PrismaModule } from '../libs/infrustructure/prisma/prisma.module';
import { RedisModule } from '../libs/infrustructure/redis/redis.module';
import { TelegramBotModule } from './telegram-bot/telegram-bot.module';
import { CurrancyModule } from '../libs/common/modules/Currancy/Currancy.module';
import { UpgrateModule } from './upgrate/Upgrate.module';
import { MultiplayerModule } from './multiplayer/multiplayer.module';
import { WinsModule } from './wins/wins.module';

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
    PrismaModule,
    RedisModule,
    CurrancyModule,
    UsersModule,
    GiftsModule,
    WinsModule,
    UpgrateModule,
    PromocodeModule,
    MultiplayerModule,
    ...(process.env.DISABLE_TELEGRAM_BOT !== 'true' ? [TelegramBotModule] : []),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
