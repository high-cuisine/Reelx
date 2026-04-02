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

export type TableGamePhase = 'lobby' | 'playing' | 'finished';

/** Состояние розыгрыша на столе (Redis). */
export interface TableGameState {
  phase: TableGamePhase;
  readyUserIds: string[];
  /** В лобби — копия состава; после старта — порядок секторов барабана (остаются только в игре). */
  activeUserIds: string[];
  lastEliminatedUserId: string | null;
  /** Индекс выбывшего в activeUserIds до удаления (для UI). */
  lastEliminatedSectorIndex: number | null;
  winnerUserId: string | null;
  round: number;
}

export interface TableState {
  ownerId: string;
  participants: string[];
  maxPlayers: number;
  currency: GameCurrancy;
  betAmount: number;
  createdAt: number;
  game?: TableGameState;
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
  game: TableGameState;
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

  private defaultGame(participantIds: string[]): TableGameState {
    return {
      phase: 'lobby',
      readyUserIds: [],
      activeUserIds: [...participantIds],
      lastEliminatedUserId: null,
      lastEliminatedSectorIndex: null,
      winnerUserId: null,
      round: 0,
    };
  }

  /** Гарантирует поле game (в т.ч. для старых записей в Redis). */
  ensureGame(table: TableState): TableGameState {
    if (!table.game) {
      table.game = this.defaultGame(table.participants);
    }
    return table.game;
  }

  private shuffle<T>(items: T[]): T[] {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
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
      game: this.defaultGame([ownerId]),
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
          if (!parsed.game) {
            parsed.game = this.defaultGame(parsed.participants);
          }
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
    const game = this.ensureGame(state);
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
      game: { ...game },
    };
  }

  async joinTable(ownerId: string, userId: string): Promise<TableState> {
    const key = this.tableKey(ownerId);
    const table = await this.getTableOrThrow(ownerId);
    const game = this.ensureGame(table);
    if (game.phase !== 'lobby') {
      throw new ConflictException('Game already started or finished');
    }

    if (table.participants.includes(userId)) {
      game.activeUserIds = [...table.participants];
      await this.redisService.set(key, JSON.stringify(table), this.TABLE_TTL);
      return table;
    }

    if (table.participants.length >= table.maxPlayers) {
      throw new ConflictException('Table is full');
    }

    await this.chargeUser(userId, table.currency, table.betAmount);

    table.participants.push(userId);
    game.activeUserIds = [...table.participants];
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

    const game = this.ensureGame(table);
    game.readyUserIds = game.readyUserIds.filter((id) => id !== userId);
    if (game.phase === 'playing') {
      game.activeUserIds = game.activeUserIds.filter((id) => id !== userId);
      game.lastEliminatedUserId = null;
      game.lastEliminatedSectorIndex = null;
      if (game.activeUserIds.length <= 1) {
        game.phase = 'finished';
        game.winnerUserId = game.activeUserIds[0] ?? null;
      }
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

  /**
   * Игрок нажал «Готов». Когда все места заняты и все готовы — старт игры (фаза playing).
   * didStartGame — только при переходе lobby→playing (для одного таймера первого раунда).
   */
  async setGameReady(
    ownerId: string,
    userId: string,
  ): Promise<{ table: TableState; didStartGame: boolean }> {
    const key = this.tableKey(ownerId);
    const table = await this.getTableOrThrow(ownerId);
    const game = this.ensureGame(table);

    if (game.phase !== 'lobby') {
      return { table, didStartGame: false };
    }
    if (!table.participants.includes(userId)) {
      throw new BadRequestException('You are not at this table');
    }
    if (table.participants.length !== table.maxPlayers) {
      throw new BadRequestException('Not all seats are filled');
    }

    if (!game.readyUserIds.includes(userId)) {
      game.readyUserIds.push(userId);
    }

    let didStartGame = false;
    const allReady = table.participants.every((id) => game.readyUserIds.includes(id));
    if (allReady) {
      game.phase = 'playing';
      game.activeUserIds = this.shuffle([...table.participants]);
      game.readyUserIds = [];
      game.round = 0;
      game.lastEliminatedUserId = null;
      game.lastEliminatedSectorIndex = null;
      game.winnerUserId = null;
      didStartGame = true;
      this.logger.log(`Table ${key}: game started, ${game.activeUserIds.length} players`);
    }

    await this.redisService.set(key, JSON.stringify(table), this.TABLE_TTL);
    return { table, didStartGame };
  }

  /**
   * Один раунд: случайно убирает одного из activeUserIds. При одном оставшемся — finished + winner.
   */
  async runEliminationRound(ownerId: string): Promise<TableState> {
    const key = this.tableKey(ownerId);
    const table = await this.getTableOrThrow(ownerId);
    const game = this.ensureGame(table);

    if (game.phase !== 'playing') {
      return table;
    }

    if (game.activeUserIds.length <= 1) {
      game.phase = 'finished';
      game.winnerUserId = game.activeUserIds[0] ?? null;
      game.lastEliminatedUserId = null;
      game.lastEliminatedSectorIndex = null;
      await this.redisService.set(key, JSON.stringify(table), this.TABLE_TTL);
      return table;
    }

    const n = game.activeUserIds.length;
    const idx = Math.floor(Math.random() * n);
    const victim = game.activeUserIds[idx];
    game.lastEliminatedUserId = victim;
    game.lastEliminatedSectorIndex = idx;
    game.activeUserIds = game.activeUserIds.filter((_, i) => i !== idx);
    game.round += 1;

    if (game.activeUserIds.length === 1) {
      game.phase = 'finished';
      game.winnerUserId = game.activeUserIds[0];
    }

    await this.redisService.set(key, JSON.stringify(table), this.TABLE_TTL);
    this.logger.log(
      `Table ${key}: round ${game.round}, eliminated ${victim}, active=${game.activeUserIds.length}`,
    );
    return table;
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
