import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { GreedyService } from './greedy.service';

interface AuthSocket extends Socket {
  userId?: string;
}

/**
 * Pushes Greedy round updates to everyone who has the game panel open:
 *  - greedy:state  — a new round opened (full public state)
 *  - greedy:bets   — live per-item bet aggregates
 *  - greedy:result — round settled (result item, winners, payout)
 */
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
      : [],
    credentials: true,
  },
  namespace: '/greedy',
  transports: ['websocket', 'polling'],
})
export class GreedyGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(GreedyGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly greedyService: GreedyService,
  ) {}

  afterInit() {
    this.greedyService.registerBroadcaster((event, payload) =>
      this.server.emit(event, payload),
    );
  }

  async handleConnection(client: AuthSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');
      const payload = this.jwtService.verify(token);
      client.userId = payload.sub || payload.id;
    } catch {
      client.disconnect();
      return;
    }

    // Send the viewer the current state immediately on join
    try {
      const state = await this.greedyService.getState(client.userId);
      client.emit('greedy:state', state);
    } catch (error) {
      this.logger.error(`Failed to send greedy state: ${error.message}`);
    }
  }
}
