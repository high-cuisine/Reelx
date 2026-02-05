import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../libs/infrustructure/prisma/prisma.service';
import { GameCurrancy } from '@prisma/client';

@Injectable()
export class PromocodeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPromocodeByCode(promocode: string) {
    return this.prisma.promocodes.findUnique({
      where: { promocode },
    });
  }

  async getUserPromocodes(userId: string, promocodeId: string) {
    const existing = await this.prisma.userPromocodes.findFirst({
      where: { userId, promocodeId },
    });
    return existing;
  }

  async createUserPromocode(userId: string, promocodeId: string) {
    return this.prisma.userPromocodes.create({
      data: {
        userId,
        promocodeId,
      },
    });
  }

  async deleteUserPromocode(id: string) {
    return this.prisma.userPromocodes.delete({
      where: { id },
    });
  }
}

