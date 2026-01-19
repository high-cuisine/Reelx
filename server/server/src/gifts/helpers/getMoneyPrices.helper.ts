export interface MoneyPrice {
  type: 'ton' | 'star';
  price: number;
}

interface PriceDistribution {
  tonPrices: number[];
  starPrices: number[];
}

// Расчет базовых цен с вариацией
const calculateBasePrices = (totalAmount: number): PriceDistribution => {
  const tonTotal = totalAmount * 0.6;
  const starTotal = totalAmount * 0.4;
  
  const tonAverage = tonTotal / 4;
  const tonPrices = [
    tonAverage * 0.8,
    tonAverage * 0.9,
    tonAverage * 1.1,
    tonAverage * 1.2,
  ];
  
  const starAverage = starTotal / 4;
  const starPrices = [
    starAverage * 0.8,
    starAverage * 0.9,
    starAverage * 1.1,
    starAverage * 1.2,
  ];
  
  return { tonPrices, starPrices };
};

// Нормализация цен чтобы сумма была равна targetAmount
const normalizePricesToAmount = (
  tonPrices: number[],
  starPrices: number[],
  targetAmount: number
): PriceDistribution => {
  const currentTonSum = tonPrices.reduce((sum, price) => sum + price, 0);
  const currentStarSum = starPrices.reduce((sum, price) => sum + price, 0);
  const currentTotal = currentTonSum + currentStarSum;
  
  const correctionFactor = targetAmount / currentTotal;
  
  return {
    tonPrices: tonPrices.map(price => price * correctionFactor),
    starPrices: starPrices.map(price => price * correctionFactor),
  };
};

// Преобразование массивов цен в формат MoneyPrice[]
const formatPricesToMoneyPrices = (
  tonPrices: number[],
  starPrices: number[]
): MoneyPrice[] => {
  const result: MoneyPrice[] = [];
  
  tonPrices.forEach(price => {
    result.push({ type: 'ton', price: Number(price.toFixed(2)) });
  });
  
  starPrices.forEach(price => {
    result.push({ type: 'star', price: Number(price.toFixed(2)) });
  });
  
  return result;
};

export const getMoneyPrices = (amount: number): MoneyPrice[] => {
  const TON_TO_USD = 1.7; 
  const STAR_TO_USD = 0.1; 
  
  const { tonPrices, starPrices } = calculateBasePrices(amount);
  const normalized = normalizePricesToAmount(tonPrices, starPrices, amount);
  
  return formatPricesToMoneyPrices(normalized.tonPrices, normalized.starPrices);
};
