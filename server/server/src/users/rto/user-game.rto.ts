import { UserGamesType, GameCurrancy } from '@prisma/client';

export class WinNftRto {
    id: string;
    giftName: string;
    giftAddress: string;
    collectionAddress?: string | null;
    image?: string | null;
    price?: number | null;
    lottieUrl: string;
}

export class UserGameRto {
    id: string;
    type: UserGamesType;
    priceAmount: number;
    priceType: GameCurrancy;
    createdAt: Date;
    /** Заполнено, если в этой игре выигран NFT (см. user_games.user_gift_id). */
    winNft?: WinNftRto;
}
