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

@ApiTags('Messaging')
@Controller('messaging')
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  // ── Legacy history endpoint ──────────────────────────────────────────────

  @Get('history')
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
  async getRooms(@Query('userId') userId: string) {
    return this.messagingService.getRoomsForUser(userId);
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
  async getMessages(
    @Param('roomId') roomId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return this.messagingService.getMessagesForRoom(
      roomId,
      Number(page),
      Number(limit),
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
