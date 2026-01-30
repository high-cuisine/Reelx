import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../libs/infrustructure/prisma/prisma.service';

@Injectable()
export class AdminGamesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters?: {
    from?: Date;
    to?: Date;
    type?: 'solo' | 'pvp' | 'upgrade';
  }) {
    const where: any = {};

    if (filters?.from || filters?.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = filters.from;
      if (filters.to) where.createdAt.lte = filters.to;
    }

    return this.prisma.userGames.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStats(filters?: {
    from?: Date;
    to?: Date;
    type?: 'solo' | 'pvp' | 'upgrade';
  }) {
    const where: any = {};

    if (filters?.from || filters?.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = filters.from;
      if (filters.to) where.createdAt.lte = filters.to;
    }

    const games = await this.prisma.userGames.findMany({ where });

    const totalGames = games.length;
    const soloGames = games.length; // все записи user_games — solo
    const pvpGames = 0;
    const upgradeGames = 0;

    const totalTurnover = games.reduce((sum, g) => sum + g.priceAmount, 0);
    const totalRake = totalTurnover;
    const totalRTP = 0;

    return {
      totalGames,
      soloGames,
      pvpGames,
      upgradeGames,
      totalRake,
      totalRTP,
      totalTurnover,
    };
  }
}
