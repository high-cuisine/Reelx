import { configPrices } from "../constants/price.config";

export const getCurrentType = (amount:number) => {
   return configPrices[Number(Object.keys(configPrices).reverse().find(el => amount > +el))];
}
