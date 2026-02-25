import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessagingService } from './messaging.service';
import { UseGuards } from '@nestjs/common';
import { RoomAccessGuard } from './room-access.guard';

@WebSocketGateway({
  namespace: '/messaging',
  cors: true,
})
export class MessagingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(private readonly messagingService: MessagingService) {}

  async handleConnection(socket: Socket) {
    // Authorization logic can be added here
  }

  async handleDisconnect(socket: Socket) {
    // Handle disconnect logic
  }

  @UseGuards(RoomAccessGuard)
  @SubscribeMessage('message:send')
  async handleMessageSend(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    const message = await this.messagingService.saveMessage(data);
    this.server.to(data.chatGroupId).emit('message:receive', message);
    return message;
  }

  @SubscribeMessage('typing:start')
  handleTypingStart(@MessageBody() data: any) {
    this.server.to(data.chatGroupId).emit('typing:start', data);
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(@MessageBody() data: any) {
    this.server.to(data.chatGroupId).emit('typing:stop', data);
  }
}
