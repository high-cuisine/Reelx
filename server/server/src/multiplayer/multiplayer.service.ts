import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { GameCurrancy, UserGamesType } from '@prisma/client';
import { RedisService } from '../../libs/infrustructure/redis/redis.service';
import { CurrancyService } from '../../libs/common/modules/Currancy/services/Currancy.service';
import { UsersService } from '../users/services/users.service';
import { UpgrateService } from '../upgrate/Upgrate.service';

export type TableGamePhase = 'lobby' | 'playing' | 'round_break' | 'finished';

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
  /** Уже вызывали выдачу приза (чтобы не дублировать). */
  winnerPrizeDispatched?: boolean;
  /** Приз победителю (NFT в инвентарь); null если подобрать/купить не удалось. */
  winnerPrize?: TableWinnerPrize | null;
  /** Сумма банка в TON для UI (WinModal). */
  potTon?: number;
  /** Участники на момент старта розыгрыша (ставка списана). */
  stakedParticipantIds?: string[];
  /** Вернулся баланс при выходе со стола — не пишем им историю финала. */
  refundedUserIds?: string[];
}

export interface TableWinnerPrize {
  giftId: string;
  name: string;
  image?: string | null;
  priceTon?: number;
  lottieUrl?: string | null;
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

  private static readonly MIN_TABLE_BET_TON = 3;

  constructor(
    private readonly redisService: RedisService,
    private readonly usersService: UsersService,
    private readonly currancyService: CurrancyService,
    private readonly upgrateService: UpgrateService,
  ) {}

  private tableKey(ownerId: string): string {
    return `table-${ownerId}`;
  }

  /** После JSON.parse из Redis значение валюты может быть в другом регистре — приводим к Prisma enum. */
  private normalizeTableCurrency(raw: unknown): GameCurrancy {
    const s = String(raw ?? '').toUpperCase();
    if (s === 'STARS' || s === 'STAR') {
      return GameCurrancy.STARS;
    }
    return GameCurrancy.TON;
  }

  private normalizeTableState(table: TableState): void {
    table.currency = this.normalizeTableCurrency(table.currency);
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

    await this.assertTableBetMinimum(currency, betAmount);

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

    await this.persistTable(key, state);
    this.logger.log(`Table created: ${key} (${currency} ${betAmount})`);
    return state;
  }

  async getTable(ownerId: string): Promise<TableState | null> {
    const data = await this.redisService.get(this.tableKey(ownerId));
    if (!data) return null;
    const table = JSON.parse(data) as TableState;
    if (Array.isArray(table.participants) && table.participants.length === 0) {
      await this.redisService.del(this.tableKey(ownerId));
      this.logger.warn(`Pruned stale empty table ${this.tableKey(ownerId)}`);
      return null;
    }
    this.normalizeTableState(table);
    return table;
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
          if (parsed.participants.length === 0) {
            await this.redisService.del(key);
            this.logger.warn(`Pruned empty table key ${key}`);
            continue;
          }
          if (!parsed.game) {
            parsed.game = this.defaultGame(parsed.participants);
          }
          this.normalizeTableState(parsed);
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
      await this.persistTable(key, table);
      return table;
    }

    if (table.participants.length >= table.maxPlayers) {
      throw new ConflictException('Table is full');
    }

    await this.chargeUser(userId, table.currency, table.betAmount);

    table.participants.push(userId);
    game.activeUserIds = [...table.participants];
    await this.persistTable(key, table);
    this.logger.log(`User ${userId} joined table ${key}`);
    return table;
  }

  async leaveTable(ownerId: string, userId: string): Promise<TableState | null> {
    const key = this.tableKey(ownerId);
    const table = await this.getTable(ownerId);
    if (!table) {
      return null;
    }

    if (!table.participants.includes(userId)) {
      return table;
    }

    const game = this.ensureGame(table);
    game.readyUserIds = game.readyUserIds.filter((id) => id !== userId);
    if (game.phase === 'playing' || game.phase === 'round_break') {
      game.activeUserIds = game.activeUserIds.filter((id) => id !== userId);
      game.lastEliminatedUserId = null;
      game.lastEliminatedSectorIndex = null;
      if (game.activeUserIds.length <= 1) {
        game.phase = 'finished';
        game.winnerUserId = game.activeUserIds[0] ?? null;
      }
    }

    await this.refundUser(userId, table.currency, table.betAmount);
    game.refundedUserIds = [...(game.refundedUserIds ?? []), userId];

    await this.dispatchTableWinnerPrize(table);

    table.participants = table.participants.filter((id) => id !== userId);

    if (table.participants.length === 0) {
      await this.redisService.del(key);
      this.logger.log(`Table ${key} deleted (empty after leave)`);
      return null;
    }

    game.activeUserIds = game.activeUserIds.filter((id) =>
      table.participants.includes(id),
    );
    game.readyUserIds = game.readyUserIds.filter((id) =>
      table.participants.includes(id),
    );

    await this.persistTable(key, table);
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
   * Игрок нажал «Готов».
   * lobby + полный стол → все участники готовы → playing (первый раунд).
   * round_break → все ещё в игре (activeUserIds) готовы → снова playing (следующий розыгрыш).
   */
  async setGameReady(
    ownerId: string,
    userId: string,
  ): Promise<{ table: TableState; didStartGame: boolean }> {
    const key = this.tableKey(ownerId);
    const table = await this.getTableOrThrow(ownerId);
    const game = this.ensureGame(table);

    if (game.phase !== 'lobby' && game.phase !== 'round_break') {
      return { table, didStartGame: false };
    }
    if (!table.participants.includes(userId)) {
      throw new BadRequestException('You are not at this table');
    }

    let didStartGame = false;

    if (game.phase === 'lobby') {
      if (table.participants.length !== table.maxPlayers) {
        throw new BadRequestException('Not all seats are filled');
      }
      if (!game.readyUserIds.includes(userId)) {
        game.readyUserIds.push(userId);
      }
      const allReady = table.participants.every((id) => game.readyUserIds.includes(id));
      if (allReady) {
        game.phase = 'playing';
        game.stakedParticipantIds = [...table.participants];
        game.activeUserIds = this.shuffle([...table.participants]);
        game.readyUserIds = [];
        game.round = 0;
        game.lastEliminatedUserId = null;
        game.lastEliminatedSectorIndex = null;
        game.winnerUserId = null;
        didStartGame = true;
        this.logger.log(`Table ${key}: game started, ${game.activeUserIds.length} players`);
      }
    } else {
      // round_break — только выжившие жмут «Готов»
      if (!game.activeUserIds.includes(userId)) {
        throw new BadRequestException('You are not active in this round');
      }
      if (!game.readyUserIds.includes(userId)) {
        game.readyUserIds.push(userId);
      }
      const allActiveReady = game.activeUserIds.every((id) =>
        game.readyUserIds.includes(id),
      );
      if (allActiveReady) {
        game.phase = 'playing';
        game.readyUserIds = [];
        game.lastEliminatedUserId = null;
        game.lastEliminatedSectorIndex = null;
        didStartGame = true;
        this.logger.log(
          `Table ${key}: round resumed, ${game.activeUserIds.length} active, round=${game.round}`,
        );
      }
    }

    await this.persistTable(key, table);
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
      await this.persistTable(key, table);
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
    } else {
      game.phase = 'round_break';
      game.readyUserIds = [];
      game.lastEliminatedSectorIndex = null;
    }

    await this.persistTable(key, table);
    this.logger.log(
      `Table ${key}: round ${game.round}, eliminated ${victim}, active=${game.activeUserIds.length}`,
    );
    return table;
  }

  // ---------------------------------------------------------------------------
  // Balance helpers
  // ---------------------------------------------------------------------------

  private async persistTable(key: string, table: TableState): Promise<void> {
    await this.dispatchTableWinnerPrize(table);
    await this.redisService.set(key, JSON.stringify(table), this.TABLE_TTL);
  }

  private async assertTableBetMinimum(
    currency: GameCurrancy,
    betAmount: number,
  ): Promise<void> {
    const minTon = MultiplayerService.MIN_TABLE_BET_TON;
    if (currency === GameCurrancy.TON) {
      if (betAmount < minTon) {
        throw new BadRequestException(`Минимальная ставка ${minTon} TON`);
      }
      return;
    }
    const rates = await this.currancyService.getCurrancyRates();
    const ton = Number(rates?.ton);
    const stars = Number(rates?.stars);
    let minStars: number;
    if (!Number.isFinite(ton) || ton <= 0 || !Number.isFinite(stars) || stars <= 0) {
      // Согласовано с чипами создания стола (100+), когда котировок нет
      minStars = 100;
    } else {
      minStars = Math.ceil((minTon * ton) / stars);
      if (!Number.isFinite(minStars) || minStars < 1) {
        minStars = 100;
      }
    }
    if (betAmount < minStars) {
      throw new BadRequestException(
        `Минимальная ставка ${minStars} Stars (эквивалент ${minTon} TON)`,
      );
    }
  }

  private async computePotTon(table: TableState): Promise<number> {
    const bank = table.betAmount * table.participants.length;
    if (table.currency === GameCurrancy.TON) {
      return Number(bank.toFixed(6));
    }
    const rates = await this.currancyService.getCurrancyRates();
    if (rates.ton <= 0) {
      return Number(bank.toFixed(6));
    }
    const ton =
      rates.stars > 0 ? (bank * rates.stars) / rates.ton : bank;
    return Number(ton.toFixed(6));
  }

  private async dispatchTableWinnerPrize(table: TableState): Promise<void> {
    const game = table.game;
    if (!game || game.phase !== 'finished' || !game.winnerUserId) {
      return;
    }
    if (game.winnerPrizeDispatched) {
      return;
    }
    game.winnerPrizeDispatched = true;
    const potTon = await this.computePotTon(table);
    game.potTon = potTon;
    try {
      const prize = await this.upgrateService.awardSingleGiftForPotTon(
        game.winnerUserId,
        potTon,
      );
      game.winnerPrize = prize;
    } catch (err: unknown) {
      this.logger.error(
        `Table winner prize failed: ${(err as Error).message}`,
      );
      game.winnerPrize = null;
    }

    const refunded = new Set(game.refundedUserIds ?? []);
    const baseIds =
      game.stakedParticipantIds && game.stakedParticipantIds.length > 0
        ? game.stakedParticipantIds
        : table.participants;
    const historyUserIds = baseIds.filter((id) => !refunded.has(id));
    const winnerGiftId = game.winnerPrize?.giftId ?? null;

    const priceType = this.normalizeTableCurrency(table.currency);

    for (const uid of historyUserIds) {
      try {
        const row = await this.usersService.createUserGame({
          userId: uid,
          type: UserGamesType.pvp,
          priceAmount: table.betAmount,
          priceType,
        });
        if (uid === game.winnerUserId && winnerGiftId) {
          await this.usersService.linkUserGameWinGift(row.id, winnerGiftId);
        }
      } catch (e: unknown) {
        this.logger.warn(
          `Table user_games row failed for ${uid}: ${(e as Error).message}`,
        );
      }
    }
  }

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
