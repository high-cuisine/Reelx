import { WheelItem, WheelGiftItem, WheelMoneyItem, WheelSecretItem } from '../interfaces/wheel-item.interface';
import { StartGameResponseDto } from '../dto/start-game-response.dto';

// Форматирование приза в минимальный формат для ответа клиенту
export const formatMinimalPrize = (item: WheelItem): StartGameResponseDto => {
  if (item.type === 'gift') {
    const gift = item as WheelGiftItem;
    return {
      type: 'gift',
      name: gift.name,
      price: gift.price,
      image: gift.image,
      address: gift.address,
      collectionAddress: gift.collection.address,
    };
  }

  if (item.type === 'money') {
    const money = item as WheelMoneyItem;
    return {
      type: 'money',
      name: money.currencyType === 'ton' ? 'TON' : 'STARS',
      price: money.amount,
      amount: money.amount,
      currencyType: money.currencyType,
    };
  }

  if (item.type === 'secret') {
    const secret = item as WheelSecretItem;
    
    if (secret.realType === 'gift') {
      return {
        type: 'secret',
        realType: 'gift',
        name: secret.name || 'Secret Gift',
        price: secret.price || 0,
        image: secret.image,
        address: secret.address,
        collectionAddress: secret.collection?.address,
      };
    } else {
      return {
        type: 'secret',
        realType: 'money',
        name: secret.currencyType === 'ton' ? 'TON' : 'STARS',
        price: secret.amount || 0,
        amount: secret.amount,
        currencyType: secret.currencyType,
      };
    }
  }

  // Fallback
  return {
    type: 'gift',
    name: 'Unknown',
    price: 0,
  };
};
