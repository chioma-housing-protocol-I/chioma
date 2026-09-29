import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessagingGateway } from './messaging.gateway';
import { MessagingService } from './messaging.service';
import { MessagingController } from './messaging.controller';
import { WebSocketSessionService } from './websocket-session.service';
import { Message } from './entities/message.entity';
import { ChatRoom } from './entities/chat-room.entity';
import { Participant } from './entities/participant.entity';
import { MessageRead } from './entities/message-read.entity';
import { CacheService } from '../../common/cache/cache.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, ChatRoom, Participant, MessageRead]),
  ],
  controllers: [MessagingController],
  providers: [
    MessagingGateway,
    MessagingService,
    WebSocketSessionService,
    CacheService,
  ],
  exports: [MessagingService, WebSocketSessionService],
})
export class MessagingModule {}
