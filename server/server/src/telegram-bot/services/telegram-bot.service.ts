import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { Context } from 'telegraf';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { UsersService } from '@/src/users/services/users.service';

@Injectable()
export class TelegramBotService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly staticsPath = path.join(process.cwd(), 'libs', 'statics');
  private readonly logger = new Logger(TelegramBotService.name);

  constructor(
    @InjectBot() private readonly bot: Telegraf,
    private readonly userService: UsersService
  ) {
    if (!fs.existsSync(this.staticsPath)) {
      fs.mkdirSync(this.staticsPath, { recursive: true });
    }
  }

  onApplicationBootstrap() {
    this.launchWithRetry();
  }

  onApplicationShutdown() {
    this.bot.stop('SIGTERM');
  }

  private async launchWithRetry() {
    while (true) {
      try {
        this.logger.log('Starting Telegram bot polling...');
        await this.bot.launch({ dropPendingUpdates: true });
        break;
      } catch (err: any) {
        if (err?.response?.error_code === 409) {
          this.logger.warn('Bot 409 conflict — another instance still running. Retrying in 65s...');
          await new Promise((r) => setTimeout(r, 65_000));
        } else {
          this.logger.error(`Bot launch failed: ${err.message}`);
          break;
        }
      }
    }
  }

  getUserData(ctx: Context): { telegramId: number; username?: string } {
    const telegramId = ctx.from?.id;
    const username = ctx.from?.username;

    if (!telegramId) {
      throw new Error('Telegram ID not found in context');
    }

    return {
      telegramId,
      username,
    };
  }

  async getUserPhoto(ctx: Context): Promise<string | null> {
    try {
      const telegramId = ctx.from?.id;
      if (!telegramId) {
        return null;
      }

      const photos = await ctx.telegram.getUserProfilePhotos(telegramId, 0, 1);
      
      if (!photos.photos || photos.photos.length === 0) {
        return null;
      }

      const photo = photos.photos[0];
      if (!photo || photo.length === 0) {
        return null;
      }

      const fileId = photo[photo.length - 1].file_id;
      const file = await ctx.telegram.getFile(fileId);
      
      const filePath = file.file_path;
      if (!filePath) {
        return null;
      }

      const token = process.env.TELEGRAM_BOT_TOKEN;
      if (!token) {
        throw new Error('TELEGRAM_BOT_TOKEN is not set');
      }

      const fileUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;
      const fileName = `${telegramId}_${Date.now()}${path.extname(filePath)}`;
      const localFilePath = path.join(this.staticsPath, fileName);

      await this.downloadFile(fileUrl, localFilePath);

      const user = await this.userService.findUserByTelegramId(String(telegramId))

      if(!user)
        await this.userService.createUser(String(telegramId), String(ctx?.from.username), fileName);

      return fileName;
    } catch (error) {
      console.error('Error getting user photo:', error);
      return null;
    }
  }

  private downloadFile(url: string, dest: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(dest);
      https
        .get(url, (response) => {
          response.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve();
          });
        })
        .on('error', (err) => {
          fs.unlink(dest, () => {});
          reject(err);
        });
    });
  }

  /**
   * URL для Mini App: только https (кроме редких тестовых случаев), без пробелов.
   * Иначе Telegram: 400 BUTTON_URL_INVALID.
   */
  private normalizeMiniAppUrl(raw: string | undefined): string | null {
    if (raw == null || typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;

    let candidate = trimmed;
    if (!/^https?:\/\//i.test(candidate)) {
      candidate = `https://${candidate}`;
    }

    try {
      const u = new URL(candidate);
      const host = u.hostname.toLowerCase();
      // Заглушки и явный мусор — не отправляем в API
      if (!host || host === 'example.com' || host === 'localhost') {
        return null;
      }
      if (u.protocol !== 'https:') {
        return null;
      }
      return u.toString();
    } catch {
      return null;
    }
  }

  sendStartMessage(appLink: string | undefined) {
    const url = this.normalizeMiniAppUrl(appLink);
    if (!url) {
      return {
        text:
          'Добро пожаловать!\n\n' +
          'Кнопка мини-приложения недоступна: в окружении сервера задайте APP_LINK — либо прямой HTTPS-URL Web App ' +
          '(домен из @BotFather → Menu Button), либо ссылку вида https://t.me/YourBot/short_name.',
        reply_markup: undefined,
      };
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return {
        text: 'Добро пожаловать!\n\nНекорректный APP_LINK.',
        reply_markup: undefined,
      };
    }

    const host = parsed.hostname.toLowerCase();
    // t.me/... — это не document URL для web_app; Telegram даёт BUTTON_URL_INVALID.
    // Для таких ссылок используем обычную кнопку url.
    const isTgDirectMiniAppLink = host === 't.me' || host === 'telegram.me';

    const openButton = isTgDirectMiniAppLink
      ? { text: 'Открыть приложение' as const, url }
      : { text: 'Открыть приложение' as const, web_app: { url } };

    return {
      text: 'Добро пожаловать!',
      reply_markup: {
        inline_keyboard: [[openButton]],
      },
    };
  }

  async createInvoiceLink(starsAmount: number, payload?: string): Promise<string> {
    try {
      const invoiceLink = await this.bot.telegram.createInvoiceLink({
        title: 'Пополнение баланса',
        description: `Пополнение баланса на ${starsAmount} звезд`,
        payload: payload || `stars_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        provider_token: '', // Для Telegram Stars не требуется
        currency: 'XTR', // XTR - валюта Telegram Stars
        prices: [
          {
            label: `${starsAmount} звезд`,
            amount: starsAmount, // Количество звезд
          },
        ],
      });

      return invoiceLink;
    } catch (error) {
      console.error('Error creating invoice link:', error);
      throw new Error('Failed to create invoice link');
    }
  }

  async handlePreCheckoutQuery(queryId: string): Promise<void> {
    try {
      await this.bot.telegram.answerPreCheckoutQuery(queryId, true);
    } catch (error) {
      console.error('Error answering pre-checkout query:', error);
      try {
        await this.bot.telegram.answerPreCheckoutQuery(queryId, false, 'Произошла ошибка при обработке платежа');
      } catch (err) {
        console.error('Error sending error response:', err);
      }
    }
  }

  async handleSuccessfulPayment(userId: string, amount: number): Promise<void> {
    try {
      await this.userService.updateStarsBalance(userId, amount);
    } catch (error) {
      console.error('Error updating user balance:', error);
      throw error;
    }
  }

  async sendMessageToUser(telegramId: string, text: string): Promise<void> {
    try {
      await this.bot.telegram.sendMessage(telegramId, text);
    } catch (error) {
      console.error('Error sending Telegram message:', error);
    }
  }

  parsePayload(payload: string): { userId: string } | null {
    try {
      // payload формат: payment_${userId}_${timestamp}
      const parts = payload.split('_');
      if (parts.length >= 2 && parts[0] === 'payment') {
        return { userId: parts[1] };
      }
      return null;
    } catch (error) {
      console.error('Error parsing payload:', error);
      return null;
    }
  }
}
