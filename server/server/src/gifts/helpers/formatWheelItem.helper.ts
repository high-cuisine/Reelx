import { WheelItem, WheelGiftItem, WheelMoneyItem, WheelSecretItem } from '../interfaces/wheel-item.interface';

interface GiftItemFormatted {
  type: 'gift' | 'money' | 'secret';
  price: number;
  image: string;
  name: string;
}

interface RawGiftItem {
  address?: string;
  name?: string;
  collection?: {
    address: string;
    name: string;
  };
  price?: string | number;
  image?: string;
  ownerAddress?: string;
  actualOwnerAddress?: string;
}

interface MoneyPrice {
  type: 'ton' | 'star';
  price: number;
}

// Форматирование элемента барабана для сохранения в Redis
export const formatWheelItem = (
  item: GiftItemFormatted | RawGiftItem | MoneyPrice,
  originalData?: any
): WheelItem => {
  // Если это money элемент
  if ('type' in item && (item.type === 'ton' || item.type === 'star')) {
    const moneyItem = item as MoneyPrice;
    return {
      type: 'money',
      amount: moneyItem.price,
      currencyType: moneyItem.type === 'ton' ? 'ton' : 'star',
    } as WheelMoneyItem;
  }

  // Если это отформатированный элемент
  if ('type' in item && item.type === 'money') {
    const formattedItem = item as GiftItemFormatted;
    const currencyType = formattedItem.name === 'TON' ? 'ton' : 'star';
    return {
      type: 'money',
      amount: formattedItem.price,
      currencyType,
    } as WheelMoneyItem;
  }

  // Если это secret элемент
  if ('type' in item && item.type === 'secret') {
    const formattedItem = item as GiftItemFormatted;
    
    // Определяем realType на основе originalData
    const hasAddress = originalData?.address || originalData?.collection?.address;
    const realType: 'gift' | 'money' = hasAddress ? 'gift' : 'money';
    
    if (realType === 'gift' && originalData) {
      return {
        type: 'secret',
        realType: 'gift',
        address: originalData.address,
        name: originalData.name || formattedItem.name,
        collection: originalData.collection,
        price: formattedItem.price,
        image: originalData.image || formattedItem.image,
        ownerAddress: originalData.ownerAddress,
        actualOwnerAddress: originalData.actualOwnerAddress,
      } as WheelSecretItem;
    } else {
      // money в secret
      const currencyType = formattedItem.name === 'TON' ? 'ton' : 'star';
      return {
        type: 'secret',
        realType: 'money',
        amount: formattedItem.price,
        currencyType,
      } as WheelSecretItem;
    }
  }

  // Если это gift элемент
  if (originalData && originalData.address) {
    return {
      type: 'gift',
      address: originalData.address,
      name: originalData.name || (item as GiftItemFormatted).name,
      collection: originalData.collection,
      price: typeof originalData.price === 'string' 
        ? Number(originalData.price) / 1_000_000_000 
        : (item as GiftItemFormatted).price,
      image: originalData.image || (item as GiftItemFormatted).image,
      ownerAddress: originalData.ownerAddress,
      actualOwnerAddress: originalData.actualOwnerAddress,
    } as WheelGiftItem;
  }

  // Fallback - если нет originalData, возвращаем минимальные данные
  const formattedItem = item as GiftItemFormatted;
  return {
    type: formattedItem.type as 'gift',
    address: '',
    name: formattedItem.name,
    collection: {
      address: '',
      name: '',
    },
    price: formattedItem.price,
    image: formattedItem.image,
    ownerAddress: '',
    actualOwnerAddress: '',
  } as WheelGiftItem;
};
