import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { UserLoginInterface } from '../interface/user-login.interface';

@Injectable()
export class ValidateTelegramInitDataPipe
  implements PipeTransform<string, UserLoginInterface>
{
  transform(value: string, metadata: ArgumentMetadata): UserLoginInterface {
    if (!this.validateInitData(value)) {
      throw new BadRequestException('Invalid Telegram initData');
    }

    return this.extractUserData(value);
  }

  private validateInitData(initData: string): boolean {
    try {
      // Парсим initData вручную, чтобы сохранить исходные закодированные значения
      // для проверки hash (Telegram требует использовать исходные значения)
      const parts = initData.split('&');
      const paramsMap = new Map<string, string>();
      let hash = '';

      for (const part of parts) {
        const [key, ...valueParts] = part.split('=');
        const value = valueParts.join('='); // На случай если в значении есть =
        
        if (key === 'hash') {
          hash = value;
        } else {
          paramsMap.set(key, value);
        }
      }

      if (!hash) {
        return false;
      }

      // Сортируем параметры по ключу и создаем строку для проверки
      // Используем исходные закодированные значения
      const dataCheckString = Array.from(paramsMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

      // Получаем токен бота из переменных окружения
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        throw new Error('TELEGRAM_BOT_TOKEN is not set');
      }

      // Создаем секретный ключ из токена бота
      const secretKey = crypto
        .createHmac('sha256', 'WebAppData')
        .update(botToken)
        .digest();

      // Вычисляем HMAC-SHA256
      const calculatedHash = crypto
        .createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

      // Сравниваем хеши
      if (calculatedHash !== hash) {
        console.error('Hash mismatch:', {
          calculated: calculatedHash,
          received: hash,
          dataCheckString: dataCheckString.substring(0, 100) + '...',
        });
        return false;
      }

      // Проверяем время (auth_date не должен быть старше 24 часов)
      const authDate = paramsMap.get('auth_date');
      if (authDate) {
        const authTimestamp = parseInt(authDate, 10);
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const timeDiff = currentTimestamp - authTimestamp;

        // Проверяем, что данные не старше 24 часов (86400 секунд)
        if (timeDiff > 86400 || timeDiff < 0) {
          return false;
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  private extractUserData(initData: string): UserLoginInterface {
    try {
      // Используем URLSearchParams для декодирования значений
      const params = new URLSearchParams(initData);
      const userParam = params.get('user');

      if (!userParam) {
        throw new BadRequestException('User data not found in initData');
      }

      // userParam уже декодирован URLSearchParams, парсим JSON
      const userData = JSON.parse(userParam);

      if (!userData.id) {
        throw new BadRequestException('Telegram user ID not found');
      }

      return {
        telegramId: String(userData.id),
        username: userData.username || '',
        photoUrl: userData.photo_url || '',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to parse user data from initData');
    }
  }
}

