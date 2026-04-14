import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WinsService } from './wins.service';

@WebSocketGateway({
  namespace: '/wins',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class WinsGateway implements OnGatewayConnection {
  @WebSocketServer()
  private readonly server: Server;

  private readonly logger = new Logger(WinsGateway.name);

  constructor(private readonly winsService: WinsService) {
    this.winsService.setBroadcaster((payload) => {
      this.server.emit('wins:update', payload);
    });
  }

  async handleConnection(client: Socket) {
    this.logger.debug(`Client connected: ${client.id}`);
    const items = await this.winsService.getCachedItems();
    client.emit('wins:init', { items });
  }
}

