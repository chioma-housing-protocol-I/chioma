import { Test, TestingModule } from '@nestjs/testing';
import { DisputesController } from '../disputes.controller';
import { DisputesService } from '../disputes.service';
import { CreateDisputeDto } from '../dto/create-dispute.dto';
import { AddCommentDto } from '../dto/add-comment.dto';
import { ResolveDisputeDto } from '../dto/resolve-dispute.dto';
import {
  Dispute,
  DisputeStatus,
  DisputeType,
} from '../entities/dispute.entity';

describe('DisputesController', () => {
  let controller: DisputesController;
  let service: DisputesService;

  const mockDispute: Dispute = {
    id: 1,
    disputeId: 'dispute-uuid-1',
    agreementId: 1,
    initiatedBy: 1,
    disputeType: DisputeType.RENT_PAYMENT,
    requestedAmount: 500,
    description: 'Test dispute description',
    status: DisputeStatus.OPEN,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Dispute;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    role: 'USER',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DisputesController],
      providers: [
        {
          provide: DisputesService,
          useValue: {
            createDispute: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            findByDisputeId: jest.fn(),
            update: jest.fn(),
            addEvidence: jest.fn(),
            addComment: jest.fn(),
            resolveDispute: jest.fn(),
            getAgreementDisputes: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<DisputesController>(DisputesController);
    service = module.get<DisputesService>(DisputesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createDispute', () => {
    it('should create a dispute', async () => {
      const createDisputeDto: CreateDisputeDto = {
        agreementId: '1',
        disputeType: DisputeType.RENT_PAYMENT,
        requestedAmount: 500,
        description: 'Test dispute description',
      };

      jest.spyOn(service, 'createDispute').mockResolvedValue(mockDispute);

      const result = await controller.createDispute(createDisputeDto, {
        user: mockUser,
      });

      expect(result).toEqual(mockDispute);
      expect(service.createDispute).toHaveBeenCalledWith(
        createDisputeDto,
        mockUser.id,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated disputes', async () => {
      const mockResult = {
        disputes: [mockDispute],
        total: 1,
      };

      jest.spyOn(service, 'findAll').mockResolvedValue(mockResult);

      const result = await controller.findAll({}, { user: mockUser });

      expect(result).toEqual(mockResult);
      expect(service.findAll).toHaveBeenCalledWith({}, mockUser.id);
    });
  });

  describe('findOne', () => {
    it('should return a dispute by ID', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockDispute);

      const result = await controller.findOne('1');

      expect(result).toEqual(mockDispute);
      expect(service.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('findByDisputeId', () => {
    it('should return a dispute by disputeId', async () => {
      jest.spyOn(service, 'findByDisputeId').mockResolvedValue(mockDispute);

      const result = await controller.findByDisputeId('dispute-uuid-1');

      expect(result).toEqual(mockDispute);
      expect(service.findByDisputeId).toHaveBeenCalledWith('dispute-uuid-1');
    });
  });

  describe('addComment', () => {
    it('should add a comment to a dispute', async () => {
      const addCommentDto: AddCommentDto = {
        content: 'Test comment',
        isInternal: false,
      };

      const mockComment: any = {
        id: 1,
        content: 'Test comment',
        disputeId: 1,
        userId: 1,
        isInternal: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(service, 'addComment').mockResolvedValue(mockComment);

      const result = await controller.addComment(
        'dispute-uuid-1',
        addCommentDto,
        { user: mockUser },
      );

      expect(result).toEqual(mockComment);
      expect(service.addComment).toHaveBeenCalledWith(
        'dispute-uuid-1',
        addCommentDto,
        mockUser.id,
      );
    });
  });

  describe('resolveDispute', () => {
    it('should resolve a dispute', async () => {
      const resolveDisputeDto: ResolveDisputeDto = {
        resolution: 'Dispute resolved in favor of tenant',
        refundAmount: 250,
      };

      const resolvedDispute = {
        ...mockDispute,
        status: DisputeStatus.RESOLVED,
        resolution: 'Dispute resolved in favor of tenant',
        resolvedAt: new Date(),
      };

      jest.spyOn(service, 'resolveDispute').mockResolvedValue(resolvedDispute);

      const result = await controller.resolveDispute(
        'dispute-uuid-1',
        resolveDisputeDto,
        { user: mockUser },
      );

      expect(result).toEqual(resolvedDispute);
      expect(service.resolveDispute).toHaveBeenCalledWith(
        'dispute-uuid-1',
        resolveDisputeDto,
        mockUser.id,
      );
    });
  });

  describe('getAgreementDisputes', () => {
    it('should return disputes for an agreement', async () => {
      jest
        .spyOn(service, 'getAgreementDisputes')
        .mockResolvedValue([mockDispute]);

      const result = await controller.getAgreementDisputes('1', {
        user: mockUser,
      });

      expect(result).toEqual([mockDispute]);
      expect(service.getAgreementDisputes).toHaveBeenCalledWith(
        '1',
        mockUser.id,
      );
    });
  });
});
