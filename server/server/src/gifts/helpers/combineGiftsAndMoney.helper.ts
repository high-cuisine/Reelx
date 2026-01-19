interface GiftItem {
  address: string;
  name: string;
  collection: {
    address: string;
    name: string;
  };
  price: string | number;
  image: string;
  ownerAddress: string;
  actualOwnerAddress: string;
}

interface MoneyPrice {
  type: 'ton' | 'star';
  price: number;
}

export type SecretItem = GiftItem | MoneyPrice;

// Случайное перемешивание массива (алгоритм Фишера-Йетса)
const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Определение случайного количества элементов каждого типа
const getRandomDistribution = (
  giftsCount: number,
  moneyCount: number,
  totalItems: number
): { gifts: number; money: number } => {
  // Минимум 1 элемент каждого типа, максимум - все доступные
  const minGifts = Math.min(1, giftsCount);
  const minMoney = Math.min(1, moneyCount);
  const maxGifts = Math.min(giftsCount, totalItems - minMoney);
  const maxMoney = Math.min(moneyCount, totalItems - minGifts);
  
  // Случайное количество подарков
  const gifts = Math.floor(Math.random() * (maxGifts - minGifts + 1)) + minGifts;
  // Остальное - валюта
  const money = Math.min(totalItems - gifts, maxMoney);
  
  return { gifts, money };
};

export const combineGiftsAndMoney = (
  gifts: GiftItem[],
  moneyPrices: MoneyPrice[],
  totalItems: number = 8
): SecretItem[] => {
  // Определяем случайное распределение
  const { gifts: giftsCount, money: moneyCount } = getRandomDistribution(
    gifts.length,
    moneyPrices.length,
    totalItems
  );
  
  // Берем случайные подарки
  const shuffledGifts = shuffleArray(gifts);
  const selectedGifts = shuffledGifts.slice(0, giftsCount);
  
  // Берем случайную валюту
  const shuffledMoney = shuffleArray(moneyPrices);
  const selectedMoney = shuffledMoney.slice(0, moneyCount);
  
  // Объединяем и перемешиваем
  const combined = [...selectedGifts, ...selectedMoney];
  
  return shuffleArray(combined);
};
