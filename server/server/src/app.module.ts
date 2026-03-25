import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { GiftsModule } from './gifts/gifts.module';
import { PromocodeModule } from './promocode/promocode.module';
import { PrismaModule } from '../libs/infrustructure/prisma/prisma.module';
import { RedisModule } from '../libs/infrustructure/redis/redis.module';
import { TelegramBotModule } from './telegram-bot/telegram-bot.module';
import { CurrancyModule } from '../libs/common/modules/Currancy/Currancy.module';
import { UpgrateModule } from './upgrate/Upgrate.module';
import { MultiplayerModule } from './multiplayer/multiplayer.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    RedisModule,
    CurrancyModule,
    UsersModule,
    GiftsModule,
    UpgrateModule,
    PromocodeModule,
    MultiplayerModule,
    ...(process.env.DISABLE_TELEGRAM_BOT !== 'true' ? [TelegramBotModule] : []),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
