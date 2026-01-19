export class StartGameResponseDto {
  type: 'gift' | 'money' | 'secret';
  name: string;
  price: number;
  image?: string;
  
  // Для gift и secret с realType='gift'
  address?: string;
  collectionAddress?: string;
  
  // Для money и secret с realType='money'
  amount?: number;
  currencyType?: 'ton' | 'star';
  
  // Для secret
  realType?: 'gift' | 'money';
}
