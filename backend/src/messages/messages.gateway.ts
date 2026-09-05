import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { MessagesService } from './messages.service';

@WebSocketGateway({ cors: true, namespace: '/chat' })
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(MessagesGateway.name);

  constructor(
    private jwt: JwtService,
    private prisma: PrismaService,
    private messagesService: MessagesService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string | undefined;
      if (!token) throw new Error('Missing token');

      const payload = this.jwt.verify<{ sub?: string }>(token);
      if (!payload.sub) throw new Error('Invalid token');

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, status: true },
      });
      if (!user || user.status !== 'ACTIVE') throw new Error('Inactive account');

      client.data.userId = user.id;
    } catch {
      client.emit('error', { message: 'Unauthorized' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_match')
  async joinMatch(@ConnectedSocket() client: Socket, @MessageBody() matchId: string) {
    const userId = client.data.userId as string | undefined;
    if (!userId) throw new WsException('Unauthorized');
    if (!matchId || typeof matchId !== 'string') throw new WsException('Invalid match id');

    await this.messagesService.assertParticipant(userId, matchId);
    await client.join(`match:${matchId}`);
    return { joined: true };
  }

  @SubscribeMessage('send_message')
  async sendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { matchId: string; type: 'TEXT' | 'EMOJI' | 'IMAGE'; content?: string; imageUrl?: string },
  ) {
    const userId = client.data.userId as string | undefined;
    if (!userId) throw new WsException('Unauthorized');

    const message = await this.messagesService.sendMessage(userId, body.matchId, {
      type: body.type,
      content: body.content,
      imageUrl: body.imageUrl,
    });

    this.server.to(`match:${body.matchId}`).emit('new_message', message);
    return message;
  }

  @SubscribeMessage('typing')
  async typing(@ConnectedSocket() client: Socket, @MessageBody() body: { matchId: string }) {
    const userId = client.data.userId as string | undefined;
    if (!userId) throw new WsException('Unauthorized');
    if (!body?.matchId || typeof body.matchId !== 'string') throw new WsException('Invalid match id');

    await this.messagesService.assertParticipant(userId, body.matchId);
    client.to(`match:${body.matchId}`).emit('typing', { userId });
  }
}
