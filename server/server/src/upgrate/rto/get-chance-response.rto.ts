import { ToyChanceRto } from './toy-chance.rto';

/** Один подарок из пула win/lose для отображения на клиенте */
export class PoolGiftRto {
  name?: string;
  image?: string;
  price?: number;
  /** win | lose */
  pool: 'win' | 'lose';
}

export class GetChanceResponseRto {
  /** Подарки пользователя с chance, bet, winning */
  userToys: ToyChanceRto[];
  /** 20 подарков: 10 для победы + 10 для проигрыша */
  poolGifts: PoolGiftRto[];
}
