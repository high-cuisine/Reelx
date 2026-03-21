
const url = 'https://tonapi.io/v2/rates?tokens=ton&currencies=usd';


export const getTonPriceUsdt = async () => {
    try {
        const response = await fetch(String(url));
        const data = await response.json();
        return data.rates.TON.prices.USD;
    }
    catch{
        console.error('cant get ton price');
    }
}

export const getCurrancyPrice = async () => {
    try {
        const tonPrice = await getTonPriceUsdt();
        const starPrice = 1/50;

        return {
            tonPrice,
            starPrice
        }
    }
    catch(e) {
        console.error('cant get currency price')
    }
}