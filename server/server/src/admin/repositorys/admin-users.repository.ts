import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../libs/infrustructure/prisma/prisma.service';
import { TransactionType } from '@prisma/client';

@Injectable()
export class AdminUsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters?: {
    search?: string;
    minBalance?: number;
    maxBalance?: number;
    dateFrom?: Date;
    dateTo?: Date;
  }) {
    const where: any = {};

    if (filters?.search) {
      where.OR = [
        { username: { contains: filters.search, mode: 'insensitive' } },
        { telegramId: { contains: filters.search } },
      ];
    }

    if (filters?.minBalance !== undefined || filters?.maxBalance !== undefined) {
      where.tonBalance = {};
      if (filters.minBalance !== undefined) where.tonBalance.gte = filters.minBalance;
      if (filters.maxBalance !== undefined) where.tonBalance.lte = filters.maxBalance;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }

    return this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
    });
  }

  async updateTonBalance(userId: string, amount: number) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        tonBalance: { increment: amount },
      },
    });
  }

  async updateStarsBalance(userId: string, amount: number) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        starsBalance: { increment: amount },
      },
    });
  }

  async createTransaction(userId: string, amount: number, type: TransactionType) {
    return this.prisma.transaction.create({
      data: {
        userId,
        amount,
        type,
      },
    });
  }

  async getUserGifts(userId: string) {
    return this.prisma.userGifts.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async setBanned(userId: string, isBanned: boolean) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isBanned },
    });
  }
}
