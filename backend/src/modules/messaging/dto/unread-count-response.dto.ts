import { ApiProperty } from '@nestjs/swagger';

export class RoomUnreadCount {
  @ApiProperty({ description: 'Room ID' })
  roomId: number;

  @ApiProperty({ description: 'Chat group ID (legacy)' })
  chatGroupId: string;

  @ApiProperty({ description: 'Number of unread messages in this room' })
  unreadCount: number;
}

export class UnreadCountResponseDto {
  @ApiProperty({
    description: 'Total unread messages across all rooms',
    example: 42,
  })
  totalUnread: number;

  @ApiProperty({
    description: 'Per-room unread counts',
    type: [RoomUnreadCount],
  })
  rooms: RoomUnreadCount[];
}
