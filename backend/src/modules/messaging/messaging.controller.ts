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
import { CreateRoomDto } from './dto/create-room.dto';
import { UserIdQueryDto } from './dto/user-id-query.dto';
import { RoomIdParamsDto } from './dto/room-id-params.dto';
import { PaginationQueryDto } from './dto/pagination.dto';

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
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.messagingService.getHistory(
      chatGroupId,
      pagination.page ?? 1,
      pagination.limit ?? 20,
    );
  }

  // ── Rooms ────────────────────────────────────────────────────────────────

  @Get('rooms')
  @ApiOperation({ summary: 'Get all chat rooms for the current user' })
  async getRooms(@Query() query: UserIdQueryDto) {
    return this.messagingService.getRoomsForUser(query.userId);
  }

  @Post('rooms')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create or find a direct message room' })
  async createRoom(@Body() body: CreateRoomDto) {
    return this.messagingService.findOrCreateRoom(
      body.userId,
      body.participantId,
    );
  }

  // ── Messages ─────────────────────────────────────────────────────────────

  @Get('rooms/:roomId/messages')
  @ApiOperation({ summary: 'Get messages for a room' })
  async getMessages(
    @Param() params: RoomIdParamsDto,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.messagingService.getMessagesForRoom(
      params.roomId,
      pagination.page ?? 1,
      pagination.limit ?? 50,
    );
  }

  @Patch('rooms/:roomId/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark all messages in a room as read' })
  async markRoomAsRead(
    @Param() params: RoomIdParamsDto,
    @Query() query: UserIdQueryDto,
  ) {
    await this.messagingService.markRoomAsRead(params.roomId, query.userId);
  }
}
