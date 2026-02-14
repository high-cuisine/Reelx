export interface MoneyPrice {
  type: 'ton' | 'star';
  price: number;
}

export interface MoneyPricesWithWeights {
  items: MoneyPrice[];
  weights: number[];
}

const RTP_DEFAULT = 0.6;

/**
 * RTP-барабан по логике:
 * - Джекпот TON 5x, джекпот Stars 3x, возврат TON 1x, возврат Stars 1x (фиксированные веса)
 * - 4 малых слота: множитель c/k, вес k*rtp (k случайный 0.1..0.2), c = 0.125
 * EV = sum(multiplier * weight) ≈ rtp
 *
 * @param amount - ставка в TON
 * @param tonToStarsRate - курс (сколько STARS за 1 TON)
 * @param rtp - return to player, по умолчанию 0.6
 */
export const getMoneyPrices = (
  amount: number,
  tonToStarsRate: number,
  rtp: number = RTP_DEFAULT,
): MoneyPricesWithWeights => {
  const jackpotTonW = 0.022 * rtp;
  const jackpotStarsW = 0.056 * rtp;
  const returnTonW = 0.111 * rtp;
  const returnStarsW = 0.111 * rtp;

  // Малые слоты: m = c / k, w = k * rtp => вклад в EV = c * rtp каждый
  // (1 - (0.022*5 + 0.056*3 + 0.111 + 0.111)) / 4 = 0.125
  const c = (1 - (0.022 * 5 + 0.056 * 3 + 0.111 + 0.111)) / 4;

  const k1 = 0.1 + Math.random() * 0.1;
  const k2 = 0.1 + Math.random() * 0.1;
  const k3 = 0.1 + Math.random() * 0.1;
  const k4 = 0.1 + Math.random() * 0.1;

  const items: MoneyPrice[] = [
    { type: 'ton', price: Number((amount * 5).toFixed(2)) },
    { type: 'star', price: Number((amount * 3 * tonToStarsRate).toFixed(2)) },
    { type: 'ton', price: Number(amount.toFixed(2)) },
    { type: 'star', price: Number((amount * tonToStarsRate).toFixed(2)) },
    { type: 'ton', price: Number((amount * (c / k1)).toFixed(2)) },
    { type: 'star', price: Number((amount * (c / k2) * tonToStarsRate).toFixed(2)) },
    { type: 'ton', price: Number((amount * (c / k3)).toFixed(2)) },
    { type: 'star', price: Number((amount * (c / k4) * tonToStarsRate).toFixed(2)) },
  ];

  const weights: number[] = [
    jackpotTonW,
    jackpotStarsW,
    returnTonW,
    returnStarsW,
    k1 * rtp,
    k2 * rtp,
    k3 * rtp,
    k4 * rtp,
  ];

  return { items, weights };
};
