import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';

interface AuthSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  cors: { origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()) : [], credentials: true },
  namespace: '/chat',
  transports: ['websocket', 'polling'],
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService,
  ) {}

  async handleConnection(client: AuthSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');
      const payload = this.jwtService.verify(token);
      client.userId = payload.sub || payload.id;
      client.join(`user:${client.userId}`);
      this.logger.log(`Chat connected: ${client.userId}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthSocket) {
    this.logger.log(`Chat disconnected: ${client.userId}`);
  }

  @SubscribeMessage('chat:private')
  async handlePrivateMessage(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { receiverId: string; content: string; type?: string },
  ) {
    if (!client.userId) return;

    const message = await this.chatService.sendMessage(client.userId, {
      receiverId: data.receiverId,
      content: data.content,
      type: data.type as any,
    });

    // Send to receiver
    this.server.to(`user:${data.receiverId}`).emit('chat:message', {
      ...message,
      isMine: false,
    });

    // Confirm to sender
    client.emit('chat:message:sent', message);
  }

  @SubscribeMessage('chat:typing')
  handleTyping(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { receiverId: string; isTyping: boolean },
  ) {
    if (!client.userId) return;
    this.server.to(`user:${data.receiverId}`).emit('chat:typing', {
      senderId: client.userId,
      isTyping: data.isTyping,
    });
  }

  @SubscribeMessage('chat:read')
  async handleRead(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { senderId: string },
  ) {
    if (!client.userId) return;
    await this.chatService.markAsRead(client.userId, data.senderId);
    this.server
      .to(`user:${data.senderId}`)
      .emit('chat:read', { readBy: client.userId });
  }
}
