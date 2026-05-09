export interface GiftItem {
    type: 'gift' | 'money' | 'secret' | 'no-loot' | 'telegram-gift';
    price: number;
    image: string;
    name: string;
    /** URL lottie-анимации (JSON) */
    lottie?: string;
    /** Уникальный id подарка Telegram (Bot API), для слотов telegram-gift */
    telegramGiftId?: string;
}