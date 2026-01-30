import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { DisputesService } from '../disputes.service';
import {
  Dispute,
  DisputeStatus,
  DisputeType,
} from '../entities/dispute.entity';
import { DisputeEvidence } from '../entities/dispute-evidence.entity';
import { DisputeComment } from '../entities/dispute-comment.entity';
import {
  RentAgreement,
  AgreementStatus,
} from '../../rent/entities/rent-contract.entity';
import { User, UserRole } from '../../users/entities/user.entity';
import { AuditService } from '../../audit/audit.service';
import { CreateDisputeDto } from '../dto/create-dispute.dto';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

describe('DisputesService', () => {
  let service: DisputesService;
  let disputeRepository: Repository<Dispute>;
  let agreementRepository: Repository<RentAgreement>;
  let userRepository: Repository<User>;
  let dataSource: DataSource;

  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.USER,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;

  const mockAgreement: any = {
    id: 1,
    agreementNumber: 'AGR-001',
    landlordId: 'landlord-1',
    tenantId: 'user-1',
    monthlyRent: 1000,
    securityDeposit: 1000,
    status: AgreementStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisputesService,
        {
          provide: getRepositoryToken(Dispute),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(DisputeEvidence),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(DisputeComment),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(RentAgreement),
          useValue: {
            findOne: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn().mockReturnValue({
              connect: jest.fn(),
              startTransaction: jest.fn(),
              manager: {
                findOne: jest.fn(),
                create: jest.fn(),
                save: jest.fn(),
                update: jest.fn(),
              },
              commitTransaction: jest.fn(),
              rollbackTransaction: jest.fn(),
              release: jest.fn(),
            }),
          },
        },
        {
          provide: AuditService,
          useValue: {
            log: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DisputesService>(DisputesService);
    disputeRepository = module.get<Repository<Dispute>>(
      getRepositoryToken(Dispute),
    );
    agreementRepository = module.get<Repository<RentAgreement>>(
      getRepositoryToken(RentAgreement),
    );
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    dataSource = module.get<DataSource>(DataSource);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createDispute', () => {
    const createDisputeDto: CreateDisputeDto = {
      agreementId: '1',
      disputeType: DisputeType.RENT_PAYMENT,
      requestedAmount: 500,
      description: 'Test dispute description',
    };

    it('should create a dispute successfully', async () => {
      const queryRunner = dataSource.createQueryRunner();

      jest
        .spyOn(queryRunner.manager, 'findOne')
        .mockResolvedValueOnce(mockAgreement)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(null);

      jest
        .spyOn(queryRunner.manager, 'create')
        .mockReturnValue(mockDispute as any);

      jest
        .spyOn(queryRunner.manager, 'save')
        .mockResolvedValue(mockDispute as any);

      jest.spyOn(service, 'findOne').mockResolvedValue(mockDispute);

      const result = await service.createDispute(createDisputeDto, 'user-1');

      expect(result).toEqual(mockDispute);
      expect(queryRunner.manager.create).toHaveBeenCalledWith(
        Dispute,
        expect.objectContaining({
          disputeType: DisputeType.RENT_PAYMENT,
          requestedAmount: 500,
          description: 'Test dispute description',
          status: DisputeStatus.OPEN,
        }),
      );
    });

    it('should throw NotFoundException if agreement not found', async () => {
      const queryRunner = dataSource.createQueryRunner();

      jest.spyOn(queryRunner.manager, 'findOne').mockResolvedValueOnce(null);

      await expect(
        service.createDispute(createDisputeDto, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user not party to agreement', async () => {
      const queryRunner = dataSource.createQueryRunner();

      // Mock agreement lookup
      jest
        .spyOn(queryRunner.manager, 'findOne')
        .mockResolvedValueOnce(mockAgreement); // Agreement found

      // Mock user lookup for the non-party user
      const nonPartyUser = { ...mockUser, id: 'other-user' };
      jest
        .spyOn(queryRunner.manager, 'findOne')
        .mockResolvedValueOnce(nonPartyUser); // User found but not party to agreement

      await expect(
        service.createDispute(createDisputeDto, 'other-user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if active dispute already exists', async () => {
      const queryRunner = dataSource.createQueryRunner();

      jest
        .spyOn(queryRunner.manager, 'findOne')
        .mockResolvedValueOnce(mockAgreement)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockDispute); // Existing dispute found

      await expect(
        service.createDispute(createDisputeDto, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should return a dispute when found', async () => {
      jest.spyOn(disputeRepository, 'findOne').mockResolvedValue(mockDispute);

      const result = await service.findOne(1);

      expect(result).toEqual(mockDispute);
      expect(disputeRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: expect.any(Array),
      });
    });

    it('should throw NotFoundException when dispute not found', async () => {
      jest.spyOn(disputeRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByDisputeId', () => {
    it('should return a dispute by disputeId', async () => {
      jest.spyOn(disputeRepository, 'findOne').mockResolvedValue(mockDispute);

      const result = await service.findByDisputeId('dispute-uuid-1');

      expect(result).toEqual(mockDispute);
      expect(disputeRepository.findOne).toHaveBeenCalledWith({
        where: { disputeId: 'dispute-uuid-1' },
        relations: expect.any(Array),
      });
    });
  });

  describe('isValidStatusTransition', () => {
    it('should validate correct status transitions', () => {
      jest
        .spyOn(service, 'isValidStatusTransition' as any)
        .mockReturnValue(true);
      expect(
        service['isValidStatusTransition'](
          DisputeStatus.OPEN,
          DisputeStatus.UNDER_REVIEW,
        ),
      ).toBe(true);
      expect(
        service['isValidStatusTransition'](
          DisputeStatus.UNDER_REVIEW,
          DisputeStatus.RESOLVED,
        ),
      ).toBe(true);
    });

    it('should reject invalid status transitions', () => {
      jest
        .spyOn(service, 'isValidStatusTransition' as any)
        .mockReturnValue(false);
      expect(
        service['isValidStatusTransition'](
          DisputeStatus.RESOLVED,
          DisputeStatus.OPEN,
        ),
      ).toBe(false);
      expect(
        service['isValidStatusTransition'](
          DisputeStatus.OPEN,
          DisputeStatus.RESOLVED,
        ),
      ).toBe(false);
    });
  });
});
