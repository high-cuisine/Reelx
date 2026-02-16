// Интерфейсы для сохранения барабана в Redis

export interface WheelGiftItem {
  type: 'gift';
  address: string;
  name: string;
  collection: {
    address: string;
    name: string;
  };
  price: number;
  image: string;
  ownerAddress: string;
  actualOwnerAddress: string;
  lottie: string;
}

export interface WheelMoneyItem {
  type: 'money';
  amount: number;
  currencyType: 'ton' | 'star';
}

export interface WheelSecretItem {
  type: 'secret';
  realType: 'gift' | 'money';
  // Если realType === 'gift', то все поля из WheelGiftItem
  address?: string;
  name?: string;
  collection?: {
    address: string;
    name: string;
  };
  price?: number;
  image?: string;
  ownerAddress?: string;
  actualOwnerAddress?: string;
  // Если realType === 'money', то поля из WheelMoneyItem
  amount?: number;
  currencyType?: 'ton' | 'star';
}

export interface WheelNoLootItem {
  type: 'no-loot';
}

export type WheelItem = WheelGiftItem | WheelMoneyItem | WheelSecretItem | WheelNoLootItem;
