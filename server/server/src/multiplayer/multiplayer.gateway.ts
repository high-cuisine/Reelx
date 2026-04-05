import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsException,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '../users/services/jwt.service';
import {
  MultiplayerService,
  TableState,
  type TableStateView,
} from './multiplayer.service';
import { JoinTableDto } from './dto/join-table.dto';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  namespace: '/multiplayer',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class MultiplayerGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private readonly server: Server;

  private readonly logger = new Logger(MultiplayerGateway.name);

  /** userId → ownerId of the table they are currently in */
  private readonly userTableMap = new Map<string, string>();

  /** ownerId → таймер следующего раунда исключения */
  private readonly eliminationTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly multiplayerService: MultiplayerService,
  ) {}

  // ---------------------------------------------------------------------------
  // Connection lifecycle
  // ---------------------------------------------------------------------------

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers?.authorization as string)?.replace('Bearer ', '');

      if (!token) {
        this.disconnect(client, 'No token provided');
        return;
      }

      const payload = this.jwtService.validateToken(token);
      client.userId = payload.userId;
      this.logger.log(`Client connected: ${client.id} (userId=${client.userId})`);
    } catch {
      this.disconnect(client, 'Invalid token');
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client disconnected: ${client.id} (userId=${client.userId})`);

    if (!client.userId) return;

    const ownerId = this.userTableMap.get(client.userId);
    if (ownerId) {
      try {
        await this.removeUserFromTable(client, ownerId);
      } catch (err: any) {
        this.logger.error(
          `Error removing user ${client.userId} from table on disconnect: ${err.message}`,
        );
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Socket events
  // ---------------------------------------------------------------------------

  /**
   * Event: join-table
   * Payload: { ownerId: string }
   * Joins the room for that table and adds userId to Redis participants.
   */
  @SubscribeMessage('join-table')
  async onJoinTable(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: JoinTableDto,
  ) {
    const userId = this.requireUserId(client);
    const { ownerId } = payload;

    try {
      const table = await this.multiplayerService.joinTable(ownerId, userId);
      const room = this.roomName(ownerId);

      await client.join(room);
      this.userTableMap.set(userId, ownerId);

      const view = await this.enrichAndBroadcast(ownerId, table);
      return { success: true, table: view };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Event: leave-table
   * Payload: { ownerId: string }
   * Removes userId from Redis participants and leaves the room.
   */
  @SubscribeMessage('leave-table')
  async onLeaveTable(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: JoinTableDto,
  ) {
    const userId = this.requireUserId(client);
    const { ownerId } = payload;

    try {
      await this.removeUserFromTable(client, ownerId);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Event: get-table
   * Payload: { ownerId: string }
   * Returns current table state without joining.
   */
  @SubscribeMessage('get-table')
  async onGetTable(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: JoinTableDto,
  ) {
    this.requireUserId(client);
    try {
      const table = await this.multiplayerService.getTableOrThrow(payload.ownerId);
      const view = await this.multiplayerService.enrichTable(table);
      return { success: true, table: view };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Event: game-ready
   * Лобби: полный стол + все готовы → playing + один таймер исключения.
   * Пауза между раундами: все выжившие готовы → снова playing + таймер (без автоцепочки).
   */
  @SubscribeMessage('game-ready')
  async onGameReady(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: JoinTableDto,
  ) {
    const userId = this.requireUserId(client);
    const { ownerId } = payload;
    try {
      const { table, didStartGame } = await this.multiplayerService.setGameReady(ownerId, userId);
      const view = await this.enrichAndBroadcast(ownerId, table);
      if (didStartGame) {
        const r = table.game?.round ?? 0;
        const delayMs = r === 0 ? 2800 : 3600;
        this.scheduleEliminationAfter(ownerId, delayMs);
      }
      return { success: true, table: view };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // ---------------------------------------------------------------------------
  // Public helpers (called from controller)
  // ---------------------------------------------------------------------------

  /**
   * HTTP create/join: игрок уже в Redis, но сокет join-table мог ещё не пройти —
   * без записи в карте handleDisconnect не вызовет leave и стол «зависает» в списке.
   */
  trackUserAtTable(userId: string, ownerId: string) {
    this.userTableMap.set(userId, ownerId);
  }

  /** HTTP leave или явный сброс привязки (сокет ещё жив). */
  forgetUserTable(userId: string) {
    this.userTableMap.delete(userId);
  }

  /** Broadcast table-deleted event and remove all clients from the room */
  notifyTableDeleted(ownerId: string) {
    this.clearEliminationTimer(ownerId);
    for (const [uid, oid] of [...this.userTableMap.entries()]) {
      if (oid === ownerId) {
        this.userTableMap.delete(uid);
      }
    }
    const room = this.roomName(ownerId);
    this.server.to(room).emit('table-deleted', { ownerId });
    this.server.in(room).socketsLeave(room);
    this.logger.log(`Table ${room} deleted — all clients evicted`);
  }

  /** Синхронизация состояния после HTTP leave (и др.). */
  async broadcastTableUpdated(ownerId: string, table: TableState): Promise<TableStateView> {
    return this.enrichAndBroadcast(ownerId, table);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async removeUserFromTable(
    client: AuthenticatedSocket,
    ownerId: string,
  ) {
    const userId = client.userId!;
    const room = this.roomName(ownerId);

    this.clearEliminationTimer(ownerId);
    const updated = await this.multiplayerService.leaveTable(ownerId, userId);
    await client.leave(room);
    this.userTableMap.delete(userId);

    if (updated) {
      await this.enrichAndBroadcast(ownerId, updated);
      const g = updated.game;
      if (
        g?.phase === 'playing' &&
        g.activeUserIds.length > 1
      ) {
        this.scheduleEliminationAfter(ownerId, 2200);
      }
    } else {
      this.notifyTableDeleted(ownerId);
    }
  }

  private async enrichAndBroadcast(
    ownerId: string,
    table: TableState,
  ): Promise<TableStateView> {
    const view = await this.multiplayerService.enrichTable(table);
    this.server.to(this.roomName(ownerId)).emit('table-updated', { table: view });
    return view;
  }

  private roomName(ownerId: string): string {
    return `table-${ownerId}`;
  }

  private requireUserId(client: AuthenticatedSocket): string {
    if (!client.userId) {
      throw new WsException('Unauthorized');
    }
    return client.userId;
  }

  private disconnect(client: Socket, reason: string) {
    client.emit('error', { message: reason });
    client.disconnect(true);
    this.logger.warn(`Client ${client.id} disconnected: ${reason}`);
  }

  private clearEliminationTimer(ownerId: string) {
    const t = this.eliminationTimers.get(ownerId);
    if (t) clearTimeout(t);
    this.eliminationTimers.delete(ownerId);
  }

  private scheduleEliminationAfter(ownerId: string, delayMs: number) {
    this.clearEliminationTimer(ownerId);
    const tid = setTimeout(async () => {
      this.eliminationTimers.delete(ownerId);
      try {
        const snap = await this.multiplayerService.getTable(ownerId);
        const g = snap?.game;
        if (!snap || g?.phase !== 'playing') {
          return;
        }
        const table = await this.multiplayerService.runEliminationRound(ownerId);
        await this.enrichAndBroadcast(ownerId, table);
      } catch (err: any) {
        this.logger.error(`Elimination round failed for ${ownerId}: ${err.message}`);
      }
    }, delayMs);
    this.eliminationTimers.set(ownerId, tid);
  }
}
