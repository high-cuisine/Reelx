import type { TelegramGiftConfig } from '../telegram-gift-config.interface';

/** Есть в каталоге Bot API, но не показан в стандартной сетке 3×3 Telegram. */
export const diamondGiftConfig: TelegramGiftConfig = {
  slug: 'diamond',
  telegramGiftId: '5170521118301225164',
  starCount: 100,
  tier: 100,
  emoji: '💎',
  name: 'Алмаз',
  nameEn: 'Diamond',
  sortOrder: 10,
  wheelEnabled: false,
};
