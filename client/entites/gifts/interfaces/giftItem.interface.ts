export interface GiftItem {
    type: 'gift' | 'money' | 'secret' | 'no-loot';
    price: number;
    image: string;
    name: string;
    /** URL lottie-анимации (JSON) */
    lottie?: string;
}