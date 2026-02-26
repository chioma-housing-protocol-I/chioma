import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getNotifications(
    @Request() req,
    @Query('isRead') isRead?: string,
    @Query('type') type?: string,
  ) {
    const userId = req.user.id;
    const filters: any = {};

    if (isRead !== undefined) {
      filters.isRead = isRead === 'true';
    }
    if (type) {
      filters.type = type;
    }

    return this.notificationsService.getUserNotifications(userId, filters);
  }

  @Get('unread/count')
  async getUnreadCount(@Request() req) {
    const userId = req.user.id;
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @Request() req) {
    const userId = req.user.id;
    return this.notificationsService.markAsRead(id, userId);
  }

  @Patch('read-all')
  async markAllAsRead(@Request() req) {
    const userId = req.user.id;
    return this.notificationsService.markAllAsRead(userId);
  }

  @Delete(':id')
  async deleteNotification(@Param('id') id: string, @Request() req) {
    const userId = req.user.id;
    return this.notificationsService.deleteNotification(id, userId);
  }

  @Delete('clear-all')
  async clearAll(@Request() req) {
    const userId = req.user.id;
    return this.notificationsService.clearAll(userId);
  }
}
