import { Game } from "@/entites/user/interface/game.interface";

const STAR_USD_PRICE = 0.01 //usd for 1 star

const url = 'https://tonapi.io/v2/rates?tokens=ton&currencies=usd';


export const getTonPriceUsdt = async () => {
    try {
        const response = await fetch(String(url));
        const data = await response.json();
        return data.rates.TON.prices.USD;
    }
    catch{
        console.error('cant get ton price')
    }
}

export const getTonBalanceByGames = async(games: Game[]) => {
    let totalBalance = 0;
    const tonPriceUsd = await getTonPriceUsdt();

    for(const game of games) {
        if(game.priceType === 'STARS') {
            const usdPricePerStars = game.priceAmount * STAR_USD_PRICE;
            const tonAmount = usdPricePerStars / tonPriceUsd;
            totalBalance+=tonAmount
        }
        if(game.priceType === 'TON') {
            totalBalance+=game.priceAmount
        }
    }

    return totalBalance;
}