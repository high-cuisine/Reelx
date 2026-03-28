export type GameType = 'solo';
export type GameCurrency = 'TON' | 'STARS';

export interface GameWinNft {
    id: string;
    giftName: string;
    giftAddress: string;
    collectionAddress?: string | null;
    image?: string | null;
    price?: number | null;
    lottieUrl: string;
}

export interface Game {
    id: string;
    type: GameType;
    priceAmount: number;
    priceType: GameCurrency;
    createdAt: string;
    winNft?: GameWinNft;
}