# Read Receipts Implementation

## Overview

The read receipt mechanism allows the messaging system to track which messages have been read by each user, enabling accurate unread badge counts and "seen" indicators throughout the application.

## Architecture

### Database Schema

The `message_read` table tracks read receipts per user per room:

```sql
CREATE TABLE message_read (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  chatRoomId INT NOT NULL,
  readAt TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP NOT NULL,
  UNIQUE KEY (userId, chatRoomId),
  FOREIGN KEY (chatRoomId) REFERENCES chat_room(id) ON DELETE CASCADE
);
```

**Key Design Decisions:**

- **Per-room tracking**: Each row represents a user's last read position in a specific room
- **Timestamp-based**: `readAt` stores the timestamp of the last message the user has seen
- **Efficient queries**: Indexes on `userId` and `(userId, chatRoomId)` enable fast lookups
- **Cascade deletion**: When a room is deleted, all read receipts are automatically removed

### Entities

#### MessageRead Entity

```typescript
@Entity('message_read')
export class MessageRead {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => ChatRoom, { onDelete: 'CASCADE' })
  chatRoom: ChatRoom;

  @Column()
  chatRoomId: number;

  @CreateDateColumn()
  readAt: Date;

  @CreateDateColumn({ update: true })
  updatedAt: Date;
}
```

## API Endpoints

### 1. Mark Room as Read

**Endpoint:** `PATCH /messaging/rooms/:roomId/read?userId=:userId`

**Description:** Marks all messages in a room as read for the specified user.

**Behavior:**

- Finds the latest message timestamp in the room
- Creates or updates the read receipt for this user/room combination
- Returns 204 No Content on success

**Example:**

```bash
curl -X PATCH "http://localhost:3000/messaging/rooms/1/read?userId=100"
```

### 2. Get Unread Counts

**Endpoint:** `GET /messaging/unread?userId=:userId`

**Description:** Returns unread message counts per room and total for a user.

**Response:**

```json
{
  "totalUnread": 15,
  "rooms": [
    {
      "roomId": 1,
      "chatGroupId": "uuid-123",
      "unreadCount": 10
    },
    {
      "roomId": 2,
      "chatGroupId": "uuid-456",
      "unreadCount": 5
    }
  ]
}
```

**Example:**

```bash
curl "http://localhost:3000/messaging/unread?userId=100"
```

## WebSocket Events

### Client → Server: `message:markRead`

Allows clients to mark a room as read in real-time.

**Payload:**

```json
{
  "roomId": "1",
  "userId": "100"
}
```

**Response:**

```json
{
  "success": true
}
```

### Server → Client: `message:readReceipt`

Emitted to all participants in a room when someone marks it as read.

**Payload:**

```json
{
  "roomId": "1",
  "userId": "100",
  "readAt": "2026-01-15T10:30:00.000Z"
}
```

**Purpose:** Allows other clients to update their UI (e.g., show "Seen by User X" indicator).

## Service Methods

### `markRoomAsRead(roomId: string, userId: string): Promise<void>`

**Logic:**

1. Validates that the room exists
2. Verifies the user is a participant
3. Gets the latest message timestamp in the room
4. Upserts the read receipt with that timestamp

**Error Handling:**

- Throws if room not found
- Throws if user is not a participant
- Silently returns if room has no messages

### `getUnreadCount(userId: string): Promise<UnreadCountResponseDto>`

**Logic:**

1. Finds all rooms the user participates in
2. For each room:
   - Gets the user's read receipt (if any)
   - Counts messages with `timestamp > readAt`
   - If no receipt exists, all messages are unread
3. Aggregates counts into total and per-room breakdown

**Performance Considerations:**

- Uses `Promise.all()` to fetch counts in parallel
- Leverages indexed queries for efficient counting

## Integration Guide

### Frontend Integration

#### 1. Display Unread Badge

```typescript
// Fetch unread counts on app load
const { totalUnread, rooms } = await fetch('/messaging/unread?userId=123')
  .then(res => res.json());

// Display badge
<Badge count={totalUnread} />
```

#### 2. Mark as Read When User Opens Room

```typescript
// REST API approach
await fetch(`/messaging/rooms/${roomId}/read?userId=${userId}`, {
  method: 'PATCH',
});

// WebSocket approach (real-time)
socket.emit('message:markRead', { roomId, userId });
```

#### 3. Listen for Read Receipts

```typescript
socket.on('message:readReceipt', ({ roomId, userId, readAt }) => {
  // Update UI to show "Seen by User X"
  updateMessageStatus(roomId, userId, readAt);
});
```

## Performance Optimization

### Indexing Strategy

The following indexes are automatically created:

- `IDX_message_read_user_room` (userId, chatRoomId) - UNIQUE
- `IDX_message_read_userId` (userId)

These enable:

- Fast lookups by user for unread counts
- Efficient upserts (INSERT ... ON DUPLICATE KEY UPDATE)
- Quick room-specific queries

### Caching Recommendations

For high-traffic applications, consider caching unread counts:

```typescript
// Cache for 30 seconds
const cacheKey = `unread:${userId}`;
let counts = await cache.get(cacheKey);

if (!counts) {
  counts = await messagingService.getUnreadCount(userId);
  await cache.set(cacheKey, counts, 30);
}
```

Invalidate cache on:

- New message received
- Room marked as read

## Testing

Comprehensive test coverage includes:

1. **Service Tests** (`messaging-read-receipts.service.spec.ts`)
   - Creating new read receipts
   - Updating existing receipts
   - Calculating unread counts
   - Edge cases (no messages, non-participants, etc.)

2. **Gateway Tests** (`messaging-read-receipts.gateway.spec.ts`)
   - WebSocket event handling
   - Broadcasting read receipts
   - Session validation
   - Error handling

Run tests:

```bash
npm test -- messaging-read-receipts
```

## Migration

Run the migration to create the `message_read` table:

```bash
npm run migration:run
```

To rollback:

```bash
npm run migration:revert
```

## Future Enhancements

Potential improvements for future iterations:

1. **Per-message read receipts**: Track individual message reads instead of room-level
2. **Bulk mark as read**: Endpoint to mark multiple rooms as read at once
3. **Read receipt settings**: Allow users to disable sending read receipts
4. **Delivery status**: Track message delivery (sent, delivered, read)
5. **Analytics**: Track read rates and engagement metrics

## Troubleshooting

### Unread counts seem incorrect

- Verify the migration ran successfully
- Check that `markRoomAsRead` is being called when users open rooms
- Ensure message timestamps are correct

### Read receipts not updating in real-time

- Verify WebSocket connection is active
- Check that clients are listening to `message:readReceipt` events
- Ensure clients are joining the correct room channels

### Performance issues with unread counts

- Review query execution plans
- Consider adding caching layer
- Optimize by batching count queries
