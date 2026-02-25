import { Controller, Get, Query } from '@nestjs/common';
import { MessagingService } from './messaging.service';

@Controller('messaging')
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

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
}
