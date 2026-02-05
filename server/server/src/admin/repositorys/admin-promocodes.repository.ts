import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../libs/infrustructure/prisma/prisma.service';
import { GameCurrancy, Prisma } from '@prisma/client';

@Injectable()
export class AdminPromocodesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.promocodes.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return this.prisma.promocodes.findUnique({
      where: { id },
    });
  }

  async create(data: {
    promocode: string;
    currency: GameCurrancy;
    amount: number;
    countUser?: number;
    isInfinity?: boolean;
  }) {
    const createData: Prisma.PromocodesUncheckedCreateInput = {
      promocode: data.promocode,
      currency: data.currency,
      amount: data.amount,
      countUser: data.countUser ?? 1,
      isInfinity: data.isInfinity ?? false,
    };
    return this.prisma.promocodes.create({
      data: createData,
    });
  }

  async delete(id: string) {
    return this.prisma.promocodes.delete({
      where: { id },
    });
  }

  async getUsageCount(promocodeId: string): Promise<number> {
    return this.prisma.userPromocodes.count({
      where: { promocodeId },
    });
  }
}
