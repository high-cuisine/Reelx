import { Injectable } from '@nestjs/common';
import { Update, Command, Ctx, On } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { TelegramBotService } from '../services/telegram-bot.service';

@Update()
@Injectable()
export class TelegramBotUpdate {
  constructor(private readonly telegramBotService: TelegramBotService) {}

  @Command('start')
  async startCommand(@Ctx() ctx: Context) {
    const userData = this.telegramBotService.getUserData(ctx);
    const photoFileName = await this.telegramBotService.getUserPhoto(ctx);

    console.log('User data:', {
      telegramId: userData.telegramId,
      username: userData.username,
      photoFileName,
    });

    const link = process.env.APP_LINK || 'https://example.com';
    const message = this.telegramBotService.sendStartMessage(link);
    await ctx.reply(message.text, { reply_markup: message.reply_markup });
  }

  @On('pre_checkout_query')
  async preCheckoutQuery(@Ctx() ctx: Context) {
    const query = (ctx as any).preCheckoutQuery || (ctx as any).update?.pre_checkout_query;
    
    if (!query) {
      return;
    }

    try {
      await this.telegramBotService.handlePreCheckoutQuery(query.id);
    } catch (error) {
      console.error('Error handling pre-checkout query:', error);
    }
  }

  @On('successful_payment')
  async successfulPayment(@Ctx() ctx: Context) {
    const message = ctx.message || (ctx as any).update?.message;
    
    if (!message || !('successful_payment' in message)) {
      return;
    }

    const payment = (message as any).successful_payment;
    if (!payment) {
      return;
    }

    try {
      const payload = payment.invoice_payload;
      const parsedPayload = this.telegramBotService.parsePayload(payload);

      if (!parsedPayload) {
        console.error('Failed to parse payment payload:', payload);
        return;
      }

      const amount = payment.total_amount || 0;
      await this.telegramBotService.handleSuccessfulPayment(parsedPayload.userId, amount);
      
      await ctx.reply(`✅ Платеж успешно обработан! Ваш баланс пополнен на ${amount} звезд.`);
    } catch (error) {
      console.error('Error handling successful payment:', error);
      await ctx.reply('❌ Произошла ошибка при обработке платежа. Пожалуйста, обратитесь в поддержку.');
    }
  }
}

