import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { GiftsModule } from './gifts/gifts.module';
import { PrismaModule } from '../libs/infrustructure/prisma/prisma.module';
import { RedisModule } from '../libs/infrustructure/redis/redis.module';
import { TelegramBotModule } from './telegram-bot/telegram-bot.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    RedisModule,
    UsersModule,
    GiftsModule,
    TelegramBotModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
