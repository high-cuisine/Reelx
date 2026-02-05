import { Controller, Post, Body, HttpCode, HttpStatus, Delete, Headers, Get, UseGuards, Param, Patch, Query, NotFoundException } from '@nestjs/common';
import { AdminAuthService } from '../services/admin-auth.service';
import { AdminLoginDto, AdminLoginResponse } from '../dto/admin-login.dto';
import { AdminSessionGuard } from '../guards/admin-session.guard';
import { AdminPromocodesRepository } from '../repositorys/admin-promocodes.repository';
import { AdminUsersRepository } from '../repositorys/admin-users.repository';
import { AdminGamesRepository } from '../repositorys/admin-games.repository';
import { AdminTransactionsRepository } from '../repositorys/admin-transactions.repository';
import { AdminSettingsRepository } from '../repositorys/admin-settings.repository';
import { GameCurrancy, TransactionType } from '@prisma/client';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminAuthService: AdminAuthService,
    private readonly promocodesRepository: AdminPromocodesRepository,
    private readonly usersRepository: AdminUsersRepository,
    private readonly gamesRepository: AdminGamesRepository,
    private readonly transactionsRepository: AdminTransactionsRepository,
    private readonly settingsRepository: AdminSettingsRepository,
  ) {}

  // Auth endpoints
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: AdminLoginDto): Promise<AdminLoginResponse> {
    return this.adminAuthService.login(loginDto);
  }

  @Get('validate')
  @UseGuards(AdminSessionGuard)
  @HttpCode(HttpStatus.OK)
  async validate(@Headers('x-session-id') sessionId: string): Promise<{ valid: boolean }> {
    return { valid: true };
  }

  @Delete('logout')
  @UseGuards(AdminSessionGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Headers('x-session-id') sessionId: string): Promise<{ success: boolean }> {
    await this.adminAuthService.logout(sessionId);
    return { success: true };
  }

  // Promocodes endpoints
  @Get('promocodes')
  @UseGuards(AdminSessionGuard)
  async getPromocodes() {
    const promocodes = await this.promocodesRepository.findAll();

    // Получаем количество использований для каждого промокода
    const promocodesWithUsage = await Promise.all(
      promocodes.map(async (promo) => {
        const usageCount = await this.promocodesRepository.getUsageCount(promo.id);
        return {
          id: promo.id,
          promocode: promo.promocode,
          currency: promo.currency,
          amount: promo.amount,
          countUser: promo.countUser,
          isInfinity: promo.isInfinity,
          createdAt: promo.createdAt.toISOString(),
          usageCount,
        };
      }),
    );

    return promocodesWithUsage;
  }

  @Post('promocodes')
  @UseGuards(AdminSessionGuard)
  async createPromocode(
    @Body()
    body: {
      promocode: string;
      currency: 'TON' | 'STARS';
      amount: number;
      type?: 'balance' | 'deposit';
      countUser?: number;
      isInfinity?: boolean;
    },
  ) {
    const promocode = await this.promocodesRepository.create({
      promocode: body.promocode,
      currency: body.currency as GameCurrancy,
      amount: body.amount,
      countUser: body.countUser,
      isInfinity: body.isInfinity,
    });

    return {
      id: promocode.id,
      promocode: promocode.promocode,
      currency: promocode.currency,
      amount: promocode.amount,
      countUser: promocode.countUser,
      isInfinity: promocode.isInfinity,
      createdAt: promocode.createdAt.toISOString(),
    };
  }

  @Delete('promocodes/:id')
  @UseGuards(AdminSessionGuard)
  async deletePromocode(@Param('id') id: string) {
    await this.promocodesRepository.delete(id);
    return { success: true };
  }

  // Games endpoints
  @Get('games/stats')
  @UseGuards(AdminSessionGuard)
  async getGamesStats(@Query('from') from?: string, @Query('to') to?: string, @Query('type') type?: 'solo' | 'pvp' | 'upgrade') {
    const stats = await this.gamesRepository.getStats({
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      type,
    });

    return {
      ...stats,
      period: {
        from: from || new Date(0).toISOString(),
        to: to || new Date().toISOString(),
      },
    };
  }

  @Get('games')
  @UseGuards(AdminSessionGuard)
  async getGames(@Query('from') from?: string, @Query('to') to?: string, @Query('type') type?: 'solo' | 'pvp' | 'upgrade') {
    return this.gamesRepository.findAll({
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      type,
    });
  }

  // Users endpoints
  @Get('users')
  @UseGuards(AdminSessionGuard)
  async getUsers(
    @Query('search') search?: string,
    @Query('minBalance') minBalance?: string,
    @Query('maxBalance') maxBalance?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const users = await this.usersRepository.findAll({
      search,
      minBalance: minBalance ? parseFloat(minBalance) : undefined,
      maxBalance: maxBalance ? parseFloat(maxBalance) : undefined,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    });

    return users.map(user => ({
      id: user.id,
      username: user.username,
      telegramId: user.telegramId,
      photoUrl: user.photoUrl,
      tonBalance: user.tonBalance,
      starsBalance: user.starsBalance,
      isBanned: user.isBanned,
      createdAt: user.createdAt.toISOString(),
    }));
  }

  @Get('users/:userId')
  @UseGuards(AdminSessionGuard)
  async getUserById(@Param('userId') userId: string) {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      username: user.username,
      telegramId: user.telegramId,
      photoUrl: user.photoUrl,
      tonBalance: user.tonBalance,
      starsBalance: user.starsBalance,
      isBanned: user.isBanned,
      createdAt: user.createdAt.toISOString(),
    };
  }

  @Post('users/:userId/ban')
  @UseGuards(AdminSessionGuard)
  async banUser(@Param('userId') userId: string) {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.usersRepository.setBanned(userId, true);
    return { success: true };
  }

  @Post('users/:userId/unban')
  @UseGuards(AdminSessionGuard)
  async unbanUser(@Param('userId') userId: string) {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.usersRepository.setBanned(userId, false);
    return { success: true };
  }

  @Patch('users/:userId/balance')
  @UseGuards(AdminSessionGuard)
  async updateBalance(
    @Param('userId') userId: string,
    @Body() body: { tonBalance?: number; starsBalance?: number },
  ) {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (body.tonBalance !== undefined) {
      const diff = body.tonBalance - user.tonBalance;
      if (diff !== 0) {
        await this.usersRepository.updateTonBalance(userId, diff);
        await this.usersRepository.createTransaction(userId, diff, TransactionType.ton);
      }
    }

    if (body.starsBalance !== undefined) {
      const diff = body.starsBalance - user.starsBalance;
      if (diff !== 0) {
        await this.usersRepository.updateStarsBalance(userId, diff);
        await this.usersRepository.createTransaction(userId, diff, TransactionType.stars);
      }
    }

    const updatedUser = await this.usersRepository.findById(userId);
    return {
      id: updatedUser!.id,
      username: updatedUser!.username,
      telegramId: updatedUser!.telegramId,
      photoUrl: updatedUser!.photoUrl,
      tonBalance: updatedUser!.tonBalance,
      starsBalance: updatedUser!.starsBalance,
      createdAt: updatedUser!.createdAt.toISOString(),
    };
  }

  @Get('users/:userId/gifts')
  @UseGuards(AdminSessionGuard)
  async getUserGifts(@Param('userId') userId: string) {
    const gifts = await this.usersRepository.getUserGifts(userId);

    return gifts.map(gift => ({
      id: gift.id,
      giftName: gift.giftName,
      image: gift.image,
      price: gift.price,
      isOut: gift.isOut,
      createdAt: gift.createdAt.toISOString(),
    }));
  }

  // Settings endpoints (только Redis, БД не используется)
  @Get('settings')
  @UseGuards(AdminSessionGuard)
  async getSettings() {
    return this.settingsRepository.getSettings();
  }

  /** Обновляет настройки только в Redis (запись admin:game:settings) */
  @Patch('settings')
  @UseGuards(AdminSessionGuard)
  async updateSettings(
    @Body() body: { soloRTP?: number; upgradeRTP?: number; wheelRTP?: number; pvpRake?: number },
  ) {
    return this.settingsRepository.setSettings(body);
  }

  @Get('settings/history')
  @UseGuards(AdminSessionGuard)
  async getSettingsHistory() {
    return this.settingsRepository.getHistory();
  }

  // Transactions endpoints
  @Get('transactions')
  @UseGuards(AdminSessionGuard)
  async getTransactions(
    @Query('userId') userId?: string,
    @Query('type') type?: 'stars' | 'ton',
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('minAmount') minAmount?: string,
    @Query('maxAmount') maxAmount?: string,
  ) {
    const transactions = await this.transactionsRepository.findAll({
      userId,
      type,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      minAmount: minAmount ? parseFloat(minAmount) : undefined,
      maxAmount: maxAmount ? parseFloat(maxAmount) : undefined,
    });

    return transactions.map(t => ({
      id: t.id,
      userId: t.userId,
      amount: t.amount,
      type: t.type.toLowerCase() as 'stars' | 'ton',
      createdAt: t.createdAt.toISOString(),
      user: t.user ? {
        id: t.user.id,
        username: t.user.username,
      } : undefined,
    }));
  }
}
