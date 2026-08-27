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
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

interface RequestWithUser extends Request {
  user: {
    id: string;
  };
}

@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiTags('Notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @ApiResponse({ status: 200, description: 'Retrieved' })
  @ApiOperation({ summary: 'Get notifications' })
  @Get()
  async getNotifications(
    @Request() req: RequestWithUser,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('isRead') isRead?: string,
    @Query('type') type?: string,
  ) {
    const userId = req.user.id;
    const filters: { isRead?: boolean; type?: string } = {};

    if (isRead !== undefined) {
      filters.isRead = isRead === 'true';
    }
    if (type) {
      filters.type = type;
    }

    const pageNumber = Math.max(1, parseInt(page, 10));
    const limitNumber = Math.max(1, parseInt(limit, 10));

    return this.notificationsService.getUserNotifications(
      userId,
      filters,
      pageNumber,
      limitNumber,
    );
  }

  @ApiResponse({ status: 200, description: 'Retrieved' })
  @ApiOperation({ summary: 'Get unread count' })
  @Get('unread/count')
  async getUnreadCount(@Request() req: RequestWithUser) {
    const userId = req.user.id;
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  @ApiResponse({ status: 200, description: 'Updated' })
  @ApiOperation({ summary: 'Mark as read' })
  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @Request() req: RequestWithUser) {
    const userId = req.user.id;
    return this.notificationsService.markAsRead(id, userId);
  }

  @ApiResponse({ status: 200, description: 'Updated' })
  @ApiOperation({ summary: 'Mark all as read' })
  @Patch('read-all')
  async markAllAsRead(@Request() req: RequestWithUser) {
    const userId = req.user.id;
    return this.notificationsService.markAllAsRead(userId);
  }

  @ApiResponse({ status: 200, description: 'Deleted' })
  @ApiOperation({ summary: 'Delete notification' })
  @Delete(':id')
  async deleteNotification(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    const userId = req.user.id;
    return this.notificationsService.deleteNotification(id, userId);
  }

  @ApiResponse({ status: 200, description: 'Deleted' })
  @ApiOperation({ summary: 'Clear all' })
  @Delete('clear-all')
  async clearAll(@Request() req: RequestWithUser) {
    const userId = req.user.id;
    return this.notificationsService.clearAll(userId);
  }
}
