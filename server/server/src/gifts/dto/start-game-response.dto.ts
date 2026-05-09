export class StartGameResponseDto {
  type: 'gift' | 'money' | 'secret' | 'telegram-gift';
  name: string;
  price: number;
  image?: string;

  /** Id подарка в каталоге Telegram Bot API (sendGift) */
  telegramGiftId?: string;

  /** Id записи UserGifts для продажи (только для gift и secret с realType='gift') */
  giftId?: string;

  // Для gift и secret с realType='gift'
  address?: string;
  collectionAddress?: string;

  // Для money и secret с realType='money'
  amount?: number;
  currencyType?: 'ton' | 'star';

  // Для secret
  realType?: 'gift' | 'money';
}
