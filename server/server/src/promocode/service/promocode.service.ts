import { BadRequestException, Injectable } from '@nestjs/common';
import { PromocodeRepository } from '../repository/promocode.repository';
import { UsersService } from '../../users/services/users.service';
import { GameCurrancy } from '@prisma/client';

@Injectable()
export class PromocodeService {
  constructor(
    private readonly promocodeRepository: PromocodeRepository,
    private readonly usersService: UsersService,
  ) {}

  async usePromocode(userId: string, promocode: string) {
    const code = promocode.trim();
    if (!code) {
      throw new BadRequestException('Промокод не может быть пустым');
    }

    const promo = await this.promocodeRepository.findPromocodeByCode(code);
    if (!promo) {
      throw new BadRequestException('Промокод не найден');
    }

    const userPromocode = await this.promocodeRepository.getUserPromocodes(
      userId,
      promo.id,
    );

    if (userPromocode.countOfUse >= promo.countUser || !promo.isInfinity) {
      throw new BadRequestException('Промокод уже использован');
    }

    // Начисляем валюту пользователю
    if (promo.currency === GameCurrancy.STARS) {
      await this.usersService.updateStarsBalance(userId, promo.amount);
    } else if (promo.currency === GameCurrancy.TON) {
      await this.usersService.updateTonBalance(userId, promo.amount);
    } else {
      throw new BadRequestException('Неверный тип валюты промокода');
    }

    // Фиксируем использование промокода
    await this.promocodeRepository.createUserPromocode(userId, promo.id);

    return {
      success: true,
      promocode: promo.promocode,
      amount: promo.amount,
      currency: promo.currency,
    };
  }
}

