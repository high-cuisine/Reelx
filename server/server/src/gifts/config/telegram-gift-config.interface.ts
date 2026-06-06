/** Статический конфиг подарка Telegram Stars (Bot API getAvailableGifts / sendGift). */
export interface TelegramGiftConfig {
  /** Внутренний slug для кода и админки */
  slug: string;
  /** ID подарка в Bot API */
  telegramGiftId: string;
  /** Стоимость отправки в Stars */
  starCount: number;
  /** Ценовой тир (15 / 25 / 50 / 100) */
  tier: 15 | 25 | 50 | 100;
  /** Emoji стикера из каталога Telegram */
  emoji: string;
  /** Отображаемое имя (RU) */
  name: string;
  /** Отображаемое имя (EN) */
  nameEn: string;
  /** Порядок в UI (как в каталоге Telegram, слева направо / сверху вниз) */
  sortOrder: number;
  /** Может попадать на барабан (управление позже через админку / env) */
  wheelEnabled: boolean;
  /** URL превью; пока пусто — на клиенте fallback на emoji */
  image?: string;
}
