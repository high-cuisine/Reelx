import { configPrices } from '../constants/price.config';

/** Режимы multi/secret сняты — всегда единый тип барабана. */
export const getCurrentType = (_amount: number) => configPrices[0];
