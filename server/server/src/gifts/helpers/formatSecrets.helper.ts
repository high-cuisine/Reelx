import { formatMoneyItem, GiftItemFormatted } from './formatGiftItem.helper';

interface MoneyPrice {
  type: 'ton' | 'star';
  price: number;
}

// Форматирование секретных элементов (комбинация подарков и валюты)
export const formatSecrets = (items: any[]): GiftItemFormatted[] => {
  return items.map((item: any) => {
    
    if (item?.type === 'ton' || item?.type === 'star') {
      return formatMoneyItem(item as MoneyPrice);
    }
   
    return item as GiftItemFormatted;
  });
};
