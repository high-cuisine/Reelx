import { InternalServerErrorException } from "@nestjs/common";
const url = process.env.TON_PRICE_URL;


export const getTonPriceUsdt = async () => {
    try {
        await fetch(String(url));
    }
    catch{
        console.error('cant get ton price');
        throw new InternalServerErrorException();
    }
}