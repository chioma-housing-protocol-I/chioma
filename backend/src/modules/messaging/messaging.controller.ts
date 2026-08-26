import {
  Controller,
  Get,
  Post,
  Patch,
  Query,
  Param,
  Body,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MessagingService } from './messaging.service';
import { Deprecated } from '../../common/decorators/deprecated.decorator';
import { ApiPaginatedResponse } from '../../common/decorators/api-paginated-response.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ChatRoom } from './entities/chat-room.entity';
import { Message } from './entities/message.entity';

@ApiTags('Messaging')
@Controller('messaging')
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  // ── Legacy history endpoint ──────────────────────────────────────────────

  @Get('history')
  @ApiOperation({ summary: '[Deprecated] Get chat history for a chat group' })
  @Deprecated({
    sunsetDate: '2026-12-31T00:00:00Z',
    migrationGuideUrl:
      'https://docs.chioma.app/api/migrating-from-messaging-history',
    replacementEndpoint: '/messaging/rooms/:roomId/messages',
    message:
      'Superseded by GET /messaging/rooms/:roomId/messages, which is ' +
      'room-scoped and paginated consistently with the rest of the ' +
      'messaging API.',
  })
  async getHistory(
    @Query('chatGroupId') chatGroupId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.messagingService.getHistory(
      chatGroupId,
      Number(page),
      Number(limit),
    );
  }

  // ── Rooms ────────────────────────────────────────────────────────────────

  @Get('rooms')
  @ApiOperation({ summary: 'Get all chat rooms for the current user' })
  @ApiPaginatedResponse(ChatRoom)
  async getRooms(
    @Query('userId') userId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.messagingService.getRoomsForUser(
      userId,
      query.page,
      query.limit,
    );
  }

  @Post('rooms')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create or find a direct message room' })
  async createRoom(@Body() body: { userId: string; participantId: string }) {
    return this.messagingService.findOrCreateRoom(
      body.userId,
      body.participantId,
    );
  }

  // ── Messages ─────────────────────────────────────────────────────────────

  @Get('rooms/:roomId/messages')
  @ApiOperation({ summary: 'Get messages for a room' })
  @ApiPaginatedResponse(Message)
  async getMessages(
    @Param('roomId') roomId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.messagingService.getMessagesForRoom(
      roomId,
      query.page,
      query.limit || 50,
    );
  }

  @Patch('rooms/:roomId/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark all messages in a room as read' })
  async markRoomAsRead(
    @Param('roomId') roomId: string,
    @Query('userId') userId: string,
  ) {
    await this.messagingService.markRoomAsRead(roomId, userId);
  }
}
