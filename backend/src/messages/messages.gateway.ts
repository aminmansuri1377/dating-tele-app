import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { MessagesService } from './messages.service';

/**
 * Real-time layer. Auth: client connects with `auth: { token: <JWT> }`.
 * Each connected socket joins a room per matchId it's a participant of.
 */
@WebSocketGateway({ cors: true, namespace: '/chat' })
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(MessagesGateway.name);

  constructor(private jwt: JwtService, private messagesService: MessagesService) {}

  handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string;
      const payload = this.jwt.verify(token);
      (client.data as any).userId = payload.sub;
    } catch {
      client.emit('error', { message: 'Unauthorized' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_match')
  joinMatch(@ConnectedSocket() client: Socket, @MessageBody() matchId: string) {
    client.join(`match:${matchId}`);
  }

  @SubscribeMessage('send_message')
  async sendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { matchId: string; type: 'TEXT' | 'EMOJI' | 'IMAGE'; content?: string; imageUrl?: string },
  ) {
    const userId = (client.data as any).userId;
    if (!userId) throw new UnauthorizedException();

    const message = await this.messagesService.sendMessage(userId, body.matchId, {
      type: body.type as any,
      content: body.content,
      imageUrl: body.imageUrl,
    });

    this.server.to(`match:${body.matchId}`).emit('new_message', message);
    return message;
  }

  @SubscribeMessage('typing')
  typing(@ConnectedSocket() client: Socket, @MessageBody() body: { matchId: string }) {
    const userId = (client.data as any).userId;
    client.to(`match:${body.matchId}`).emit('typing', { userId });
  }
}
