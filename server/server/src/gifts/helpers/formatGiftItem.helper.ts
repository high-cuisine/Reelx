export interface GiftItemFormatted {
  type: 'gift' | 'money' | 'secret';
  price: number;
  image: string;
  name: string;
}

interface RawGiftItem {
  price?: string | number;
  image?: string;
  name?: string;
}

interface MoneyPrice {
  type: 'ton' | 'star';
  price: number;
}

// Конвертация цены из nanoTON в TON
const convertPriceToTon = (price: string | number | undefined): number => {
  if (typeof price === 'string') {
    return Number(price) / 1_000_000_000;
  }
  return Number(price ?? 0);
};

// Форматирование NFT подарка в формат GiftItem
export const formatGiftItem = (
  item: RawGiftItem,
  fallbackType: 'gift' | 'secret' = 'gift',
): GiftItemFormatted => {
  const priceNumber = convertPriceToTon(item?.price);

  return {
    type: fallbackType,
    price: priceNumber,
    image: item?.image ?? '',
    name: item?.name ?? 'Gift',
  };
};

// Форматирование денежных элементов в формат GiftItem
export const formatMoneyItems = (
  items: MoneyPrice[],
): GiftItemFormatted[] => {
  return items.map((m) => ({
    type: 'money',
    price: m.price,
    image: '',
    name: m.type === 'star' ? 'STARS' : 'TON',
  }));
};

// Форматирование одного денежного элемента
export const formatMoneyItem = (item: MoneyPrice): GiftItemFormatted => {
  return {
    type: 'money',
    price: item.price,
    image: '',
    name: item.type === 'star' ? 'STARS' : 'TON',
  };
};
