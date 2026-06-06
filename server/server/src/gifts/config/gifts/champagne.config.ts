import type { TelegramGiftConfig } from '../telegram-gift-config.interface';

/** Есть в каталоге Bot API, но не показан в стандартной сетке 3×3 Telegram. */
export const champagneGiftConfig: TelegramGiftConfig = {
  slug: 'champagne',
  telegramGiftId: '6028601630662853006',
  starCount: 50,
  tier: 50,
  emoji: '🍾',
  name: 'Шампанское',
  nameEn: 'Champagne',
  sortOrder: 11,
  wheelEnabled: false,
};
