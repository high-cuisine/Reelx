import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { GameCurrancy } from '@prisma/client';
import { RedisService } from '../../libs/infrustructure/redis/redis.service';
import { UsersService } from '../users/services/users.service';

export interface TableState {
  ownerId: string;
  participants: string[];
  maxPlayers: number;
  currency: GameCurrancy;
  betAmount: number;
  createdAt: number;
}

/** Участник как отдаём в API (профиль из БД) */
export interface TableParticipantView {
  userId: string;
  username: string;
  photoUrl: string | null;
}

export interface TableStateView {
  ownerId: string;
  participants: TableParticipantView[];
  maxPlayers: number;
  currency: GameCurrancy;
  betAmount: number;
  createdAt: number;
}

@Injectable()
export class MultiplayerService {
  private readonly logger = new Logger(MultiplayerService.name);
  private readonly TABLE_TTL = 24 * 60 * 60;

  constructor(
    private readonly redisService: RedisService,
    private readonly usersService: UsersService,
  ) {}

  private tableKey(ownerId: string): string {
    return `table-${ownerId}`;
  }

  // ---------------------------------------------------------------------------
  // Table CRUD
  // ---------------------------------------------------------------------------

  async createTable(
    ownerId: string,
    currency: GameCurrancy,
    betAmount: number,
    maxPlayers: number,
  ): Promise<TableState> {
    const key = this.tableKey(ownerId);
    if (await this.redisService.exists(key)) {
      throw new ConflictException('You already have an active table');
    }

    await this.chargeUser(ownerId, currency, betAmount);

    const state: TableState = {
      ownerId,
      participants: [ownerId],
      maxPlayers,
      currency,
      betAmount,
      createdAt: Date.now(),
    };

    await this.redisService.set(key, JSON.stringify(state), this.TABLE_TTL);
    this.logger.log(`Table created: ${key} (${currency} ${betAmount})`);
    return state;
  }

  async getTable(ownerId: string): Promise<TableState | null> {
    const data = await this.redisService.get(this.tableKey(ownerId));
    if (!data) return null;
    return JSON.parse(data) as TableState;
  }

  async getTableOrThrow(ownerId: string): Promise<TableState> {
    const table = await this.getTable(ownerId);
    if (!table) throw new NotFoundException(`Table of owner "${ownerId}" not found`);
    return table;
  }

  /**
   * Сырые столы из Redis (participants = id).
   */
  private async collectTablesFromRedis(): Promise<TableState[]> {
    const keys = await this.redisService.keysByPattern('table-*');
    const tables: TableState[] = [];
    for (const key of keys) {
      const raw = await this.redisService.get(key);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw) as TableState;
        if (
          parsed &&
          typeof parsed.ownerId === 'string' &&
          Array.isArray(parsed.participants) &&
          typeof parsed.maxPlayers === 'number' &&
          parsed.betAmount != null
        ) {
          tables.push(parsed);
        }
      } catch {
        this.logger.warn(`Skip invalid table JSON for key ${key}`);
      }
    }
    tables.sort((a, b) => b.createdAt - a.createdAt);
    return tables;
  }

  /**
   * Все активные столы с username и photoUrl участников.
   */
  async listTables(): Promise<TableStateView[]> {
    const raw = await this.collectTablesFromRedis();
    return Promise.all(raw.map((t) => this.enrichTable(t)));
  }

  async enrichTable(state: TableState): Promise<TableStateView> {
    const participants: TableParticipantView[] = await Promise.all(
      state.participants.map(async (userId) => {
        const user = await this.usersService.findUserById(userId);
        return {
          userId,
          username: user?.username ?? `player_${userId.slice(0, 8)}`,
          photoUrl: user?.photoUrl ?? null,
        };
      }),
    );
    return {
      ownerId: state.ownerId,
      participants,
      maxPlayers: state.maxPlayers,
      currency: state.currency,
      betAmount: state.betAmount,
      createdAt: state.createdAt,
    };
  }

  async joinTable(ownerId: string, userId: string): Promise<TableState> {
    const key = this.tableKey(ownerId);
    const table = await this.getTableOrThrow(ownerId);

    if (table.participants.includes(userId)) {
      return table;
    }

    if (table.participants.length >= table.maxPlayers) {
      throw new ConflictException('Table is full');
    }

    await this.chargeUser(userId, table.currency, table.betAmount);

    table.participants.push(userId);
    await this.redisService.set(key, JSON.stringify(table), this.TABLE_TTL);
    this.logger.log(`User ${userId} joined table ${key}`);
    return table;
  }

  async leaveTable(ownerId: string, userId: string): Promise<TableState | null> {
    const key = this.tableKey(ownerId);
    const table = await this.getTableOrThrow(ownerId);

    if (!table.participants.includes(userId)) {
      return table;
    }

    await this.refundUser(userId, table.currency, table.betAmount);

    table.participants = table.participants.filter((id) => id !== userId);

    if (table.participants.length === 0) {
      await this.redisService.del(key);
      this.logger.log(`Table ${key} deleted (empty after leave)`);
      return null;
    }

    await this.redisService.set(key, JSON.stringify(table), this.TABLE_TTL);
    this.logger.log(`User ${userId} left table ${key}`);
    return table;
  }

  async deleteTable(ownerId: string): Promise<void> {
    const key = this.tableKey(ownerId);
    const table = await this.getTable(ownerId);

    if (table) {
      await Promise.all(
        table.participants.map((uid) =>
          this.refundUser(uid, table.currency, table.betAmount),
        ),
      );
    }

    await this.redisService.del(key);
    this.logger.log(`Table ${key} deleted, all participants refunded`);
  }

  // ---------------------------------------------------------------------------
  // Balance helpers
  // ---------------------------------------------------------------------------

  private async chargeUser(
    userId: string,
    currency: GameCurrancy,
    amount: number,
  ): Promise<void> {
    const balance = await this.usersService.getBalance(userId);

    if (currency === GameCurrancy.TON) {
      if (balance.tonBalance < amount) {
        throw new BadRequestException(
          `Insufficient TON balance: required ${amount}, available ${balance.tonBalance}`,
        );
      }
      await this.usersService.updateTonBalance(userId, -amount);
    } else {
      if (balance.starsBalance < amount) {
        throw new BadRequestException(
          `Insufficient STARS balance: required ${amount}, available ${balance.starsBalance}`,
        );
      }
      await this.usersService.updateStarsBalance(userId, -amount);
    }
  }

  private async refundUser(
    userId: string,
    currency: GameCurrancy,
    amount: number,
  ): Promise<void> {
    if (currency === GameCurrancy.TON) {
      await this.usersService.updateTonBalance(userId, amount);
    } else {
      await this.usersService.updateStarsBalance(userId, amount);
    }
  }
}
