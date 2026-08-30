# Read Receipts Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Client Applications                          │
│  (Web, Mobile, Desktop - React/TypeScript/Native)                   │
└──────────────────┬────────────────────────┬─────────────────────────┘
                   │                        │
                   │ HTTP/REST              │ WebSocket
                   │                        │
┌──────────────────▼────────────────────────▼─────────────────────────┐
│                        NestJS Backend                                │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │           MessagingController                               │   │
│  │  • PATCH /rooms/:roomId/read  (mark as read)               │   │
│  │  • GET /unread                (get counts)                  │   │
│  └────────────────────┬───────────────────────────────────────┘   │
│                       │                                             │
│  ┌────────────────────▼───────────────────────────────────────┐   │
│  │           MessagingService                                  │   │
│  │  • markRoomAsRead(roomId, userId)                          │   │
│  │  • getUnreadCount(userId)                                  │   │
│  │  • saveMessage(data)                                       │   │
│  │  • getMessagesForRoom(roomId)                              │   │
│  └────────────────────┬───────────────────────────────────────┘   │
│                       │                                             │
│  ┌────────────────────▼───────────────────────────────────────┐   │
│  │           MessagingGateway (WebSocket)                      │   │
│  │  • message:markRead         (client → server)              │   │
│  │  • message:readReceipt      (server → clients)             │   │
│  │  • message:send             (existing)                      │   │
│  │  • message:receive          (existing)                      │   │
│  └────────────────────┬───────────────────────────────────────┘   │
│                       │                                             │
└───────────────────────┼─────────────────────────────────────────────┘
                        │
                        │ TypeORM
                        │
┌───────────────────────▼─────────────────────────────────────────────┐
│                      PostgreSQL Database                             │
│                                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐               │
│  │   Message   │  │  ChatRoom   │  │ MessageRead  │               │
│  ├─────────────┤  ├─────────────┤  ├──────────────┤               │
│  │ id          │  │ id          │  │ id           │               │
│  │ content     │  │ chatGroupId │  │ userId       │ ◄── NEW       │
│  │ senderId    │  │             │  │ chatRoomId   │               │
│  │ receiverId  │  │             │  │ readAt       │               │
│  │ timestamp   │  │             │  │ updatedAt    │               │
│  │ chatRoomId  │  │             │  │              │               │
│  └──────┬──────┘  └──────┬──────┘  └──────┬───────┘               │
│         │                │                 │                        │
│         │     ┌──────────┴─────────────────┘                        │
│         │     │        Foreign Keys                                 │
│         │     │                                                     │
│         └─────┴─────────────────────────────────────────           │
│                                                                      │
│  Indexes:                                                           │
│  • message_read(userId, chatRoomId) - UNIQUE                       │
│  • message_read(userId)                                            │
│  • message(chatRoomId, timestamp)  (existing)                      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagrams

### 1. Mark Room as Read (REST API)

```
┌──────────┐                                                  ┌──────────┐
│  Client  │                                                  │ Database │
└────┬─────┘                                                  └────┬─────┘
     │                                                              │
     │ PATCH /rooms/1/read?userId=100                              │
     ├─────────────────────────────────────────────►              │
     │                                              │              │
     │                                    ┌─────────▼──────────┐  │
     │                                    │ MessagingController│  │
     │                                    └─────────┬──────────┘  │
     │                                              │              │
     │                                    ┌─────────▼──────────┐  │
     │                                    │ MessagingService   │  │
     │                                    │                    │  │
     │                                    │ 1. Get room        ├──┼─► SELECT * FROM chat_room
     │                                    │ 2. Validate user   │  │   WHERE id = 1
     │                                    │ 3. Get latest msg  ├──┼─► SELECT * FROM message
     │                                    │ 4. Upsert receipt  │  │   WHERE chatRoomId = 1
     │                                    └─────────┬──────────┘  │   ORDER BY timestamp DESC
     │                                              │              │
     │                                              │              │
     │                                              ├──────────────┼─► INSERT INTO message_read
     │                                              │              │   (userId, chatRoomId, readAt)
     │                                              │              │   VALUES (100, 1, NOW())
     │                                              │              │   ON DUPLICATE KEY UPDATE
     │                                              │              │   readAt = NOW()
     │                                              │              │
     │ 204 No Content                               │              │
     │◄─────────────────────────────────────────────┤              │
     │                                                              │
```

### 2. Mark Room as Read (WebSocket)

```
┌──────────┐     ┌──────────┐     ┌────────────┐     ┌──────────┐
│ Client A │     │ Client B │     │  Gateway   │     │ Database │
└────┬─────┘     └────┬─────┘     └─────┬──────┘     └────┬─────┘
     │                │                   │                 │
     │ emit('message:markRead',           │                 │
     │      {roomId:1, userId:100})       │                 │
     ├────────────────────────────────────►                 │
     │                │                   │                 │
     │                │         ┌─────────▼──────────┐      │
     │                │         │ MessagingService   │      │
     │                │         │ markRoomAsRead()   │      │
     │                │         └─────────┬──────────┘      │
     │                │                   │                 │
     │                │                   ├─────────────────┼─► Upsert receipt
     │                │                   │                 │
     │                │         emit to room:               │
     │                │         'message:readReceipt'       │
     │                │         {roomId, userId, readAt}    │
     │◄───────────────┼───────────────────┤                 │
     │                │◄──────────────────┤                 │
     │                │                   │                 │
     │ (Update UI:    │ (Update UI:       │                 │
     │  mark visible) │  show "Read by    │                 │
     │                │  User 100")       │                 │
     │                │                   │                 │
```

### 3. Get Unread Counts

```
┌──────────┐                                                  ┌──────────┐
│  Client  │                                                  │ Database │
└────┬─────┘                                                  └────┬─────┘
     │                                                              │
     │ GET /messaging/unread?userId=100                            │
     ├─────────────────────────────────────────────►              │
     │                                              │              │
     │                                    ┌─────────▼──────────┐  │
     │                                    │ MessagingController│  │
     │                                    └─────────┬──────────┘  │
     │                                              │              │
     │                                    ┌─────────▼──────────┐  │
     │                                    │ MessagingService   │  │
     │                                    │ getUnreadCount()   │  │
     │                                    │                    │  │
     │                                    │ 1. Get all rooms   ├──┼─► SELECT r.* FROM chat_room r
     │                                    │    for user        │  │   INNER JOIN participant p
     │                                    │                    │  │   ON p.chatRoomId = r.id
     │                                    │                    │  │   WHERE p.userId = 100
     │                                    │                    │  │
     │                                    │ 2. For each room:  │  │
     │                                    │                    │  │
     │                                    │   Get receipt      ├──┼─► SELECT * FROM message_read
     │                                    │                    │  │   WHERE userId = 100
     │                                    │                    │  │   AND chatRoomId = ?
     │                                    │                    │  │
     │                                    │   Count unread     ├──┼─► SELECT COUNT(*) FROM message
     │                                    │   messages         │  │   WHERE chatRoomId = ?
     │                                    │                    │  │   AND timestamp > ?
     │                                    │                    │  │
     │                                    │ 3. Aggregate       │  │
     │                                    │    totals          │  │
     │                                    └─────────┬──────────┘  │
     │                                              │              │
     │ {totalUnread: 15, rooms: [...]}             │              │
     │◄─────────────────────────────────────────────┤              │
     │                                                              │
```

## Entity Relationships

```
┌────────────────────┐
│     ChatRoom       │
│                    │
│ • id               │
│ • chatGroupId      │
└────────┬───────────┘
         │
         │ 1:N
         │
┌────────▼───────────┐          ┌────────────────────┐
│     Message        │          │   MessageRead      │ ◄── NEW
│                    │          │                    │
│ • id               │          │ • id               │
│ • content          │          │ • userId           │
│ • senderId         │          │ • chatRoomId       │ ────┐
│ • receiverId       │          │ • readAt           │     │
│ • timestamp        │          │ • updatedAt        │     │ N:1
│ • chatRoomId       │ ────┐    │                    │     │
└────────────────────┘     │    └────────────────────┘     │
                           │                               │
                           │              ┌────────────────┘
                           │              │
                           │              │
                     ┌─────▼──────────────▼───┐
                     │     ChatRoom           │
                     └────────────────────────┘

Relationships:
• Message.chatRoomId → ChatRoom.id (N:1)
• MessageRead.chatRoomId → ChatRoom.id (N:1, CASCADE)
• MessageRead has UNIQUE constraint on (userId, chatRoomId)
```

## Algorithm: Calculate Unread Count

```
function getUnreadCount(userId):
  1. Get all rooms user participates in
     rooms = SELECT room FROM chat_room
             JOIN participant ON room.id = participant.chatRoomId
             WHERE participant.userId = userId

  2. For each room in parallel:
     a. Get read receipt for (userId, roomId)
        receipt = SELECT readAt FROM message_read
                  WHERE userId = userId AND chatRoomId = room.id

     b. If receipt exists:
          unread = COUNT messages WHERE
                   chatRoomId = room.id AND
                   timestamp > receipt.readAt
        Else:
          unread = COUNT messages WHERE chatRoomId = room.id

     c. Store {roomId, chatGroupId, unreadCount}

  3. Sum all unread counts for total

  4. Return {totalUnread, rooms: [...]}
```

## Performance Characteristics

### Indexes Used

```sql
-- Fast lookup of receipts for a user
message_read(userId)

-- Fast upsert of receipts
message_read(userId, chatRoomId) [UNIQUE]

-- Fast counting of unread messages
message(chatRoomId, timestamp)
```

### Query Complexity

| Operation              | Complexity | Notes                         |
| ---------------------- | ---------- | ----------------------------- |
| Mark as read           | O(1)       | Single upsert with index      |
| Get unread for 1 room  | O(log N)   | Indexed timestamp comparison  |
| Get unread for M rooms | O(M log N) | Parallelized per-room queries |

### Optimization Opportunities

1. **Caching**: Cache unread counts with 30-60s TTL
2. **Materialized View**: Pre-aggregate counts for heavy users
3. **Redis Counter**: Real-time counter updates via events
4. **Read Replicas**: Route count queries to replicas

## Security Flow

```
Client Request
      │
      ▼
┌─────────────────┐
│ Authentication  │ ─── JWT/Session validation
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Authorization   │ ─── Verify user is room participant
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Input Validation│ ─── Sanitize roomId, userId
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Business Logic  │ ─── Mark as read / Get counts
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Database Query  │ ─── Parameterized queries (TypeORM)
└─────────────────┘
```

## Event Flow (WebSocket)

```
New Message Arrives
      │
      ├──► emit('message:receive') ──► All clients in room receive message
      │
      └──► Client UI shows message
              │
              ├──► If room is open/focused
              │         │
              │         └──► emit('message:markRead', {roomId, userId})
              │                   │
              │                   ├──► Server: markRoomAsRead()
              │                   │
              │                   └──► emit('message:readReceipt')
              │                         to all clients in room
              │                               │
              │                               └──► Update UI: "Read by User X"
              │
              └──► Else: Show unread badge
```

## Migration Strategy

```
Current State         Migration         New State
     │                    │                  │
     │                    │                  │
┌────▼───────┐      ┌────▼───────┐    ┌────▼───────┐
│  Message   │      │ CREATE     │    │  Message   │
│            │      │ message_   │    │            │
│ (no readAt)│ ───► │ read table │───►│ (no change)│
│            │      │            │    │            │
└────────────┘      │ + indexes  │    └────────────┘
                    │ + FK       │          │
                    └────────────┘          │
                                            │
                                      ┌─────▼──────┐
                                      │ MessageRead│ ◄── NEW
                                      │            │
                                      │ Tracks all │
                                      │ read state │
                                      └────────────┘

Backward Compatible: ✓
- No changes to existing tables
- Existing queries still work
- New feature is additive
```

## Scalability Considerations

```
Load Profile:
• Reads (unread counts): HIGH frequency
• Writes (mark as read): MEDIUM frequency
• Messages sent: VARIES by usage

Scaling Strategy:

1. Database Level:
   ┌────────────────┐
   │ Primary (Write)│ ◄── markRoomAsRead()
   └────────┬───────┘
            │
            │ Replication
            │
    ┌───────▼───────┐
    │ Replica (Read)│ ◄── getUnreadCount()
    └───────────────┘

2. Application Level:
   ┌──────────┐
   │  Redis   │ ◄── Cache unread counts (30s TTL)
   └────┬─────┘
        │
   ┌────▼─────────┐
   │ NestJS App 1 │
   │ NestJS App 2 │ ◄── Horizontal scaling
   │ NestJS App N │
   └──────────────┘

3. WebSocket Level:
   ┌──────────────┐
   │ Redis Adapter│ ◄── Sync events across instances
   └──────────────┘
```
