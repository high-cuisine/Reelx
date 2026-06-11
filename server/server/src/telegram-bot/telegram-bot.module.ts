import { forwardRef, Global, Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { TelegramBotService } from './services/telegram-bot.service';
import { TelegramBotUpdate } from './update/telegram-bot.update';
import { UsersModule } from '../users/users.module';

@Global()
@Module({
  imports: [
    TelegrafModule.forRootAsync({
      useFactory: () => {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        if (!token) {
          throw new Error('TELEGRAM_BOT_TOKEN is not set in environment variables');
        }
        return {
          token,
          launchOptions: { dropPendingUpdates: true },
        };
      },
    }),
    forwardRef(() => UsersModule)
  ],
  providers: [TelegramBotService, TelegramBotUpdate],
  exports: [TelegramBotService],
})
export class TelegramBotModule {}
