import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { MessagingService } from './messaging.service';
import { RoomAccessGuard } from './room-access.guard';
import { WebSocketSessionService } from './websocket-session.service';
import { SendMessageDto } from './dto/send-message.dto';

@WebSocketGateway({
  namespace: '/messaging',
  cors: true,
})
export class MessagingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessagingGateway.name);

  constructor(
    private readonly messagingService: MessagingService,
    private readonly sessionService: WebSocketSessionService,
  ) {}

  async handleConnection(socket: Socket) {
    try {
      const userId = socket.handshake.query.userId as string;
      if (!userId) {
        this.logger.warn(`Connection rejected — no userId: ${socket.id}`);
        socket.disconnect();
        return;
      }

      const session = await this.sessionService.createSession(
        userId,
        socket.id,
      );
      socket.data.sessionId = session.id;
      socket.data.userId = userId;

      this.logger.log(
        `Client connected: ${socket.id} | session: ${session.id}`,
      );
    } catch (err) {
      this.logger.error(`handleConnection error: ${err.message}`);
      socket.disconnect();
    }
  }

  async handleDisconnect(socket: Socket) {
    if (socket.data.sessionId) {
      await this.sessionService.deleteSession(socket.data.sessionId);
    }
    this.logger.log(`Client disconnected: ${socket.id}`);
  }

  @UseGuards(RoomAccessGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  @SubscribeMessage('message:send')
  async handleMessageSend(
    @MessageBody() data: SendMessageDto,
    @ConnectedSocket() socket: Socket,
  ) {
    const valid = await this.sessionService.validateSession(
      socket.data.sessionId,
    );
    if (!valid) {
      socket.emit('error', { message: 'Session expired or invalid' });
      socket.disconnect();
      return;
    }

    await this.sessionService.updateActivity(socket.data.sessionId);

    const message = await this.messagingService.saveMessage(data);
    this.server.to(data.chatGroupId).emit('message:receive', message);
    return message;
  }

  @SubscribeMessage('typing:start')
  async handleTypingStart(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    await this.sessionService.updateActivity(socket.data.sessionId);
    this.server.to(data.chatGroupId).emit('typing:start', data);
  }

  @SubscribeMessage('typing:stop')
  async handleTypingStop(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    await this.sessionService.updateActivity(socket.data.sessionId);
    this.server.to(data.chatGroupId).emit('typing:stop', data);
  }

  @SubscribeMessage('session:ping')
  async handlePing(@ConnectedSocket() socket: Socket) {
    const valid = await this.sessionService.validateSession(
      socket.data.sessionId,
    );
    if (!valid) {
      socket.emit('session:expired');
      socket.disconnect();
      return;
    }
    await this.sessionService.updateActivity(socket.data.sessionId);
    return { status: 'ok', sessionId: socket.data.sessionId };
  }
}
