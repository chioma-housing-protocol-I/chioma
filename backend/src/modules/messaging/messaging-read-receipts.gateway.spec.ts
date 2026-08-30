import { Test, TestingModule } from '@nestjs/testing';
import { MessagingGateway } from './messaging.gateway';
import { MessagingService } from './messaging.service';
import { WebSocketSessionService } from './websocket-session.service';
import { Socket } from 'socket.io';

describe('MessagingGateway - Read Receipts', () => {
  let gateway: MessagingGateway;
  let messagingService: MessagingService;
  let sessionService: WebSocketSessionService;
  let mockSocket: Partial<Socket>;

  const mockMessagingService = {
    markRoomAsRead: jest.fn(),
    chatRoomRepository: {
      findOne: jest.fn(),
    },
  };

  const mockSessionService = {
    validateSession: jest.fn(),
    updateActivity: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingGateway,
        {
          provide: MessagingService,
          useValue: mockMessagingService,
        },
        {
          provide: WebSocketSessionService,
          useValue: mockSessionService,
        },
      ],
    }).compile();

    gateway = module.get<MessagingGateway>(MessagingGateway);
    messagingService = module.get<MessagingService>(MessagingService);
    sessionService = module.get<WebSocketSessionService>(
      WebSocketSessionService,
    );

    // Mock the WebSocket server
    gateway.server = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    } as any;

    mockSocket = {
      data: {
        sessionId: 'session-123',
        userId: '100',
      },
      emit: jest.fn(),
      disconnect: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleMarkAsRead', () => {
    it('should mark room as read and emit read receipt event', async () => {
      const data = {
        roomId: '1',
        userId: '100',
      };

      const mockRoom = {
        id: 1,
        chatGroupId: 'room-uuid-123',
      };

      mockSessionService.validateSession.mockResolvedValue(true);
      mockMessagingService.markRoomAsRead.mockResolvedValue(undefined);
      mockMessagingService.chatRoomRepository.findOne.mockResolvedValue(
        mockRoom,
      );

      const result = await gateway.handleMarkAsRead(data, mockSocket as Socket);

      expect(mockSessionService.validateSession).toHaveBeenCalledWith(
        'session-123',
      );
      expect(mockSessionService.updateActivity).toHaveBeenCalledWith(
        'session-123',
      );
      expect(mockMessagingService.markRoomAsRead).toHaveBeenCalledWith(
        '1',
        '100',
      );
      expect(gateway.server.to).toHaveBeenCalledWith('room-uuid-123');
      expect(gateway.server.emit).toHaveBeenCalledWith(
        'message:readReceipt',
        expect.objectContaining({
          roomId: '1',
          userId: '100',
          readAt: expect.any(Date),
        }),
      );
      expect(result).toEqual({ success: true });
    });

    it('should reject if session is invalid', async () => {
      const data = { roomId: '1', userId: '100' };

      mockSessionService.validateSession.mockResolvedValue(false);

      await gateway.handleMarkAsRead(data, mockSocket as Socket);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Session expired or invalid',
      });
      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(mockMessagingService.markRoomAsRead).not.toHaveBeenCalled();
    });

    it('should handle errors from marking room as read', async () => {
      const data = { roomId: '1', userId: '100' };
      const error = new Error('User is not a participant');

      mockSessionService.validateSession.mockResolvedValue(true);
      mockMessagingService.markRoomAsRead.mockRejectedValue(error);

      const result = await gateway.handleMarkAsRead(data, mockSocket as Socket);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: error.message,
      });
      expect(result).toEqual({
        success: false,
        error: 'User is not a participant',
      });
      expect(gateway.server.emit).not.toHaveBeenCalled();
    });

    it('should not emit event if room not found', async () => {
      const data = { roomId: '999', userId: '100' };

      mockSessionService.validateSession.mockResolvedValue(true);
      mockMessagingService.markRoomAsRead.mockResolvedValue(undefined);
      mockMessagingService.chatRoomRepository.findOne.mockResolvedValue(null);

      const result = await gateway.handleMarkAsRead(data, mockSocket as Socket);

      expect(result).toEqual({ success: true });
      expect(gateway.server.emit).not.toHaveBeenCalled();
    });
  });
});
