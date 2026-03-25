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
import { MultiplayerService, TableState } from './multiplayer.service';
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

      this.broadcastTableUpdate(ownerId, table);
      return { success: true, table };
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
      return { success: true, table };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // ---------------------------------------------------------------------------
  // Public helpers (called from controller)
  // ---------------------------------------------------------------------------

  /** Broadcast table-deleted event and remove all clients from the room */
  notifyTableDeleted(ownerId: string) {
    const room = this.roomName(ownerId);
    this.server.to(room).emit('table-deleted', { ownerId });
    this.server.in(room).socketsLeave(room);
    this.logger.log(`Table ${room} deleted — all clients evicted`);
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

    const updated = await this.multiplayerService.leaveTable(ownerId, userId);
    await client.leave(room);
    this.userTableMap.delete(userId);

    if (updated) {
      this.broadcastTableUpdate(ownerId, updated);
    } else {
      // Table was destroyed (no participants left)
      this.server.to(room).emit('table-deleted', { ownerId });
      this.server.in(room).socketsLeave(room);
    }
  }

  private broadcastTableUpdate(ownerId: string, table: TableState) {
    this.server.to(this.roomName(ownerId)).emit('table-updated', { table });
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
}
