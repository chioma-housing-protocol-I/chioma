/**
 * [INTEGRATION] Messaging System Integration Tests
 *
 * Tests the MessagingService and MessagingController in isolation using
 * SQLite in-memory + mocked WebSocketSessionService/CacheService.
 * Covers: room creation, message persistence, retrieval, pagination,
 * read-marking, and idempotent room lookup.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MessagingModule } from '../src/modules/messaging/messaging.module';
import { MessagingService } from '../src/modules/messaging/messaging.service';
import { WebSocketSessionService } from '../src/modules/messaging/websocket-session.service';
import { CacheService } from '../src/common/cache/cache.service';
import { Message } from '../src/modules/messaging/entities/message.entity';
import { ChatRoom } from '../src/modules/messaging/entities/chat-room.entity';
import { Participant } from '../src/modules/messaging/entities/participant.entity';
import { getTestDatabaseConfig, clearRepositories } from './test-helpers';

// ─── Mock CacheService so session tracking has no external dependency ─────────

const mockCacheStore = new Map<string, any>();

const mockCacheService = {
  get: jest.fn(async (key: string) => mockCacheStore.get(key) ?? null),
  set: jest.fn(async (key: string, value: any) => {
    mockCacheStore.set(key, value);
  }),
  invalidate: jest.fn(async (key: string) => {
    mockCacheStore.delete(key);
  }),
};

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('[INTEGRATION] Messaging System (e2e)', () => {
  let app: INestApplication;
  let messagingService: MessagingService;
  let messageRepository: any;
  let chatRoomRepository: any;
  let participantRepository: any;

  const USER_A = '1';
  const USER_B = '2';
  const USER_C = '3';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env.test' }),
        TypeOrmModule.forRoot(
          getTestDatabaseConfig([Message, ChatRoom, Participant]),
        ),
        MessagingModule,
      ],
    })
      .overrideProvider(CacheService)
      .useValue(mockCacheService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    await app.init();

    messagingService = moduleFixture.get<MessagingService>(MessagingService);
    messageRepository = moduleFixture.get(getRepositoryToken(Message));
    chatRoomRepository = moduleFixture.get(getRepositoryToken(ChatRoom));
    participantRepository = moduleFixture.get(getRepositoryToken(Participant));
  });

  beforeEach(async () => {
    mockCacheStore.clear();
    jest.clearAllMocks();
    await clearRepositories([
      messageRepository,
      participantRepository,
      chatRoomRepository,
    ]);
  });

  afterEach(async () => {
    await clearRepositories([
      messageRepository,
      participantRepository,
      chatRoomRepository,
    ]);
  });

  afterAll(async () => {
    await clearRepositories([
      messageRepository,
      participantRepository,
      chatRoomRepository,
    ]);
    await app?.close();
  });

  // ── Room Management ──────────────────────────────────────────────────────

  describe('Room Management', () => {
    it('creates a new DM room between two users', async () => {
      const room = await messagingService.findOrCreateRoom(USER_A, USER_B);

      expect(room).toBeDefined();
      expect(room.id).toBeDefined();
      expect(room.chatGroupId).toBeDefined();
      expect(room.participants).toHaveLength(2);
    });

    it('returns the same room when called again for the same pair (idempotent)', async () => {
      const room1 = await messagingService.findOrCreateRoom(USER_A, USER_B);
      const room2 = await messagingService.findOrCreateRoom(USER_A, USER_B);

      expect(room1.id).toBe(room2.id);
    });

    it('creates distinct rooms for different user pairs', async () => {
      const roomAB = await messagingService.findOrCreateRoom(USER_A, USER_B);
      const roomAC = await messagingService.findOrCreateRoom(USER_A, USER_C);

      expect(roomAB.id).not.toBe(roomAC.id);
    });

    it('returns all rooms for a user via HTTP GET /messaging/rooms', async () => {
      await messagingService.findOrCreateRoom(USER_A, USER_B);
      await messagingService.findOrCreateRoom(USER_A, USER_C);

      const res = await request(app.getHttpServer())
        .get('/messaging/rooms')
        .query({ userId: USER_A })
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });

    it('returns empty list when user has no rooms', async () => {
      const res = await request(app.getHttpServer())
        .get('/messaging/rooms')
        .query({ userId: '999' })
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(0);
    });

    it('POST /messaging/rooms creates or retrieves a room', async () => {
      const res = await request(app.getHttpServer())
        .post('/messaging/rooms')
        .send({ userId: USER_A, participantId: USER_B })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('chatGroupId');

      // Calling again returns same room
      const res2 = await request(app.getHttpServer())
        .post('/messaging/rooms')
        .send({ userId: USER_A, participantId: USER_B })
        .expect(201);

      expect(res2.body.id).toBe(res.body.id);
    });
  });

  // ── Message Persistence ──────────────────────────────────────────────────

  describe('Message Persistence', () => {
    let roomId: number;
    let chatGroupId: string;

    beforeEach(async () => {
      const room = await messagingService.findOrCreateRoom(USER_A, USER_B);
      roomId = room.id;
      chatGroupId = room.chatGroupId;
    });

    it('saves a message associated with a chat room', async () => {
      const message = await messagingService.saveMessage({
        senderId: parseInt(USER_A, 10),
        receiverId: parseInt(USER_B, 10),
        content: 'Hello from integration test',
        chatRoom: { id: roomId },
      });

      expect(message).toBeDefined();
      expect(message.id).toBeDefined();
      expect(message.content).toBe('Hello from integration test');
      expect(message.senderId).toBe(parseInt(USER_A, 10));
    });

    it('throws when saveMessage receives an array instead of an object', async () => {
      await expect(messagingService.saveMessage([] as any)).rejects.toThrow(
        'saveMessage expects a single message object, not an array',
      );
    });

    it('retrieves message history by chatGroupId', async () => {
      await messagingService.saveMessage({
        senderId: parseInt(USER_A, 10),
        receiverId: parseInt(USER_B, 10),
        content: 'Message 1',
        chatRoom: { id: roomId },
      });

      await messagingService.saveMessage({
        senderId: parseInt(USER_B, 10),
        receiverId: parseInt(USER_A, 10),
        content: 'Message 2',
        chatRoom: { id: roomId },
      });

      const history = await messagingService.getHistory(chatGroupId);

      expect(history).toHaveLength(2);
      expect(history[0].content).toBe('Message 1');
      expect(history[1].content).toBe('Message 2');
    });

    it('returns empty history for a chatGroupId with no messages', async () => {
      const history = await messagingService.getHistory('non-existent-group');

      expect(Array.isArray(history)).toBe(true);
      expect(history).toHaveLength(0);
    });
  });

  // ── Message Retrieval and Pagination ─────────────────────────────────────

  describe('Message Retrieval and Pagination', () => {
    let roomId: number;

    beforeEach(async () => {
      const room = await messagingService.findOrCreateRoom(USER_A, USER_B);
      roomId = room.id;

      // Seed 15 messages
      for (let i = 1; i <= 15; i++) {
        await messagingService.saveMessage({
          senderId: parseInt(USER_A, 10),
          receiverId: parseInt(USER_B, 10),
          content: `Message ${i}`,
          chatRoom: { id: roomId },
        });
      }
    });

    it('paginates messages using getMessagesForRoom', async () => {
      const page1 = await messagingService.getMessagesForRoom(
        String(roomId),
        1,
        5,
      );
      const page2 = await messagingService.getMessagesForRoom(
        String(roomId),
        2,
        5,
      );

      expect(page1).toHaveLength(5);
      expect(page2).toHaveLength(5);
      // Different pages return different messages
      const page1Ids = page1.map((m) => m.id);
      const page2Ids = page2.map((m) => m.id);
      expect(page1Ids.some((id) => page2Ids.includes(id))).toBe(false);
    });

    it('returns last page with remaining messages', async () => {
      const page3 = await messagingService.getMessagesForRoom(
        String(roomId),
        3,
        5,
      );

      expect(page3).toHaveLength(5);
    });

    it('returns empty array beyond last page', async () => {
      const page4 = await messagingService.getMessagesForRoom(
        String(roomId),
        4,
        5,
      );

      expect(page4).toHaveLength(0);
    });

    it('GET /messaging/rooms/:roomId/messages returns paginated messages', async () => {
      const res = await request(app.getHttpServer())
        .get(`/messaging/rooms/${roomId}/messages`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeLessThanOrEqual(10);
    });

    it('GET /messaging/history returns messages for a chatGroupId', async () => {
      const room = await messagingService.findOrCreateRoom(USER_A, USER_B);

      const res = await request(app.getHttpServer())
        .get('/messaging/history')
        .query({ chatGroupId: room.chatGroupId })
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ── Read Status Management ────────────────────────────────────────────────

  describe('Read Status Management', () => {
    it('PATCH /messaging/rooms/:roomId/read returns 204 and completes without error', async () => {
      const room = await messagingService.findOrCreateRoom(USER_A, USER_B);

      await messagingService.saveMessage({
        senderId: parseInt(USER_B, 10),
        receiverId: parseInt(USER_A, 10),
        content: 'Unread message',
        chatRoom: { id: room.id },
      });

      await request(app.getHttpServer())
        .patch(`/messaging/rooms/${room.id}/read`)
        .query({ userId: USER_A })
        .expect(204);
    });

    it('markRoomAsRead does not throw for non-existent room', async () => {
      await expect(
        messagingService.markRoomAsRead('99999', USER_A),
      ).resolves.not.toThrow();
    });
  });

  // ── WebSocket Session Service ─────────────────────────────────────────────

  describe('WebSocket Session Service', () => {
    let sessionService: WebSocketSessionService;

    beforeAll(() => {
      // Re-resolve from the already-compiled module
      // It's available via the NestJS container
    });

    it('session creation and validation lifecycle works end-to-end', async () => {
      sessionService = app.get(WebSocketSessionService);

      const session = await sessionService.createSession(
        USER_A,
        'socket-conn-id-1',
      );

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.userId).toBe(USER_A);

      const isValid = await sessionService.validateSession(session.id);
      expect(isValid).toBe(true);

      await sessionService.deleteSession(session.id);

      const isValidAfterDelete = await sessionService.validateSession(
        session.id,
      );
      expect(isValidAfterDelete).toBe(false);
    });

    it('tracks multiple sessions per user up to the max', async () => {
      sessionService = app.get(WebSocketSessionService);

      const s1 = await sessionService.createSession(USER_C, 'conn-c-1');
      const s2 = await sessionService.createSession(USER_C, 'conn-c-2');

      const count = await sessionService.getUserConnectionCount(USER_C);
      expect(count).toBeGreaterThanOrEqual(2);

      // Cleanup
      await sessionService.deleteAllUserSessions(USER_C);
    });

    it('getSession returns null for non-existent session ID', async () => {
      sessionService = app.get(WebSocketSessionService);

      const result = await sessionService.getSession('does-not-exist');
      expect(result).toBeNull();
    });

    it('validateSession returns false for unknown session', async () => {
      sessionService = app.get(WebSocketSessionService);

      const isValid = await sessionService.validateSession('unknown-session');
      expect(isValid).toBe(false);
    });
  });
});
