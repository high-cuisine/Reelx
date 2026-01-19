export type InputCurrency = 'ton' | 'stars';

// Пока курс захардкожен здесь. Смысл: amount приходит в currency, на выходе TON.
export const convertAmountToTon = (
  amount: number,
  currency: InputCurrency,
): number => {
  // 1 TON = 1.7 USD, 1 STAR = 0.1 USD
  const TON_TO_USD = 1.7;
  const STAR_TO_USD = 0.1;

  if (currency === 'ton') return amount;

  // stars -> USD -> TON
  const usd = amount * STAR_TO_USD;
  const ton = usd / TON_TO_USD;

  // не округляем агрессивно, чтобы поиск по цене в nftbuyber был точнее
  return Number(ton.toFixed(6));
};

