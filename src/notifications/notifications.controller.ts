import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get notifications for logged-in user' })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved user notifications',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              message: { type: 'string' },
              type: { type: 'string' },
              isRead: { type: 'boolean' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (default: 10)',
  })
  async getNotificationsByUser(
    @Request() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.notificationsService.getNotificationsByUser(
      userId,
      page,
      limit,
    );
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a single notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markOneAsRead(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.sub || req.user.id;
    return this.notificationsService.markAsRead(id, userId);
  }

  @Patch(':id/unread')
  @ApiOperation({ summary: 'Mark a single notification as unread' })
  @ApiResponse({ status: 200, description: 'Notification marked as unread' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markOneAsUnread(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.sub || req.user.id;
    return this.notificationsService.markAsUnread(id, userId);
  }

  @Patch('all/read')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllAsRead(@Request() req: any) {
    const userId = req.user.sub || req.user.id;
    return this.notificationsService.markAllAsRead(userId);
  }
}
