import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentService } from './document.service';
import { Document } from './document.entity';

describe('DocumentService', () => {
  let service: DocumentService;
  let repo: Repository<Document>;

  const mockDoc: Document = {
    id: 'doc-1',
    name: 'Lease Agreement.pdf',
    type: 'LEASE' as any,
    status: 'ACTIVE' as any,
    category: 'lease',
    fileKey: 'docs/user/test.pdf',
    fileSize: 1024000,
    fileType: 'application/pdf',
    propertyId: 'prop-1',
    tenantId: null,
    ownerId: 'user-1',
    description: 'Test document',
    sharedWith: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRepo = {
    create: jest.fn().mockReturnValue(mockDoc),
    save: jest.fn().mockResolvedValue(mockDoc),
    findOne: jest.fn().mockResolvedValue(mockDoc),
    find: jest.fn().mockResolvedValue([mockDoc]),
    remove: jest.fn().mockResolvedValue(mockDoc),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockDoc], 1]),
      getMany: jest.fn().mockResolvedValue([mockDoc]),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentService,
        {
          provide: getRepositoryToken(Document),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<DocumentService>(DocumentService);
    repo = module.get<Repository<Document>>(getRepositoryToken(Document));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('creates a document record', async () => {
      const dto = {
        name: 'Lease Agreement.pdf',
        type: 'LEASE',
        category: 'lease',
        fileKey: 'docs/user/test.pdf',
        fileSize: 1024000,
        fileType: 'application/pdf',
      };

      const result = await service.create(dto, 'user-1');
      expect(result).toEqual(mockDoc);
      expect(mockRepo.create).toHaveBeenCalled();
      expect(mockRepo.save).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('returns paginated documents', async () => {
      const result = await service.findAll('user-1', {});
      expect(result.documents).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockRepo.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('returns a document by id', async () => {
      const result = await service.findOne('doc-1', 'user-1');
      expect(result).toEqual(mockDoc);
    });

    it('throws NotFoundException for missing document', async () => {
      mockRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.findOne('invalid', 'user-1')).rejects.toThrow(
        'Document not found',
      );
    });
  });

  describe('update', () => {
    it('updates document metadata', async () => {
      const result = await service.update(
        'doc-1',
        { name: 'Updated.pdf' },
        'user-1',
      );
      expect(result).toEqual(mockDoc);
    });

    it('throws ForbiddenException for non-owner', async () => {
      mockRepo.findOne.mockResolvedValueOnce({
        ...mockDoc,
        ownerId: 'other-user',
      });
      await expect(
        service.update('doc-1', { name: 'Test' }, 'user-1'),
      ).rejects.toThrow('Only the owner can update this document');
    });
  });

  describe('remove', () => {
    it('deletes a document', async () => {
      await expect(service.remove('doc-1', 'user-1')).resolves.not.toThrow();
    });

    it('throws ForbiddenException for non-owner', async () => {
      mockRepo.findOne.mockResolvedValueOnce({
        ...mockDoc,
        ownerId: 'other-user',
      });
      await expect(service.remove('doc-1', 'user-1')).rejects.toThrow(
        'Only the owner can delete this document',
      );
    });
  });

  describe('share', () => {
    it('shares a document with a tenant', async () => {
      mockRepo.findOne.mockResolvedValueOnce({ ...mockDoc, sharedWith: null });
      const result = await service.share('doc-1', 'tenant-1', 'user-1');
      expect(result).toEqual(mockDoc);
    });

    it('does not re-add an already shared tenant', async () => {
      const docWithShared = { ...mockDoc, sharedWith: ['tenant-1'] };
      mockRepo.findOne.mockResolvedValueOnce(docWithShared);
      const result = await service.share('doc-1', 'tenant-1', 'user-1');
      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ sharedWith: ['tenant-1'] }),
      );
    });

    it('prevents non-owner from sharing', async () => {
      mockRepo.findOne.mockResolvedValueOnce({
        ...mockDoc,
        ownerId: 'other-user',
      });
      await expect(
        service.share('doc-1', 'tenant-1', 'user-1'),
      ).rejects.toThrow('Only the owner can share this document');
    });
  });

  describe('findSharedWithUser', () => {
    it('finds documents shared with a user', async () => {
      const result = await service.findSharedWithUser('tenant-1');
      expect(result).toEqual([mockDoc]);
    });
  });
});
