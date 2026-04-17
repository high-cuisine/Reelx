import { configPrices } from "../constants/price.config";

export const getCurrentType = (amount: number) => {
    if (!Number.isFinite(amount) || amount <= 0) {
        return configPrices[0];
    }
    const key = Object.keys(configPrices)
        .reverse()
        .find((el) => amount > +el);
    if (key === undefined) {
        return configPrices[0];
    }
    const type = configPrices[Number(key) as keyof typeof configPrices];
    return type ?? configPrices[0];
};
