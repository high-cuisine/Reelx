import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../libs/infrustructure/prisma/prisma.service';
import { UserGamesType, GameCurrancy } from '@prisma/client';

@Injectable()
export class GiftsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createUserGame(data: {
    userId: string;
    type: UserGamesType;
    priceAmount: number;
    priceType: GameCurrancy;
  }) {
    return this.prisma.userGames.create({
      data,
    });
  }
}
