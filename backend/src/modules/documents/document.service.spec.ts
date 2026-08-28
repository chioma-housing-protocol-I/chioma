import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentService } from './document.service';
import { Document } from './document.entity';

describe('DocumentService', () => {
  let service: DocumentService;
  let _repo: Repository<Document>;

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
    signatures: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockRepo = {
    create: jest.fn().mockReturnValue(mockDoc),
    save: jest.fn().mockResolvedValue(mockDoc),
    findOne: jest.fn().mockResolvedValue(mockDoc),
    find: jest.fn().mockResolvedValue([mockDoc]),
    remove: jest.fn().mockResolvedValue(mockDoc),
    softRemove: jest.fn().mockResolvedValue(mockDoc),
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
    _repo = module.get<Repository<Document>>(getRepositoryToken(Document));
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
      expect(result.data).toHaveLength(1);
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
      void (await service.share('doc-1', 'tenant-1', 'user-1'));
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
      expect(result.data).toEqual([mockDoc]);
    });
  });

  describe('retrieval authorization', () => {
    it('allows the owner to retrieve the document', async () => {
      mockRepo.findOne.mockResolvedValueOnce({ ...mockDoc });
      await expect(service.findOne('doc-1', 'user-1')).resolves.toBeDefined();
    });

    it('allows a shared user to retrieve the document', async () => {
      mockRepo.findOne.mockResolvedValueOnce({
        ...mockDoc,
        sharedWith: ['tenant-9'],
      });
      const result = await service.findOne('doc-1', 'tenant-9');
      expect(result.id).toBe('doc-1');
    });

    it('allows the document tenant to retrieve the document', async () => {
      mockRepo.findOne.mockResolvedValueOnce({
        ...mockDoc,
        tenantId: 'tenant-5',
      });
      const result = await service.findOne('doc-1', 'tenant-5');
      expect(result.id).toBe('doc-1');
    });

    it('denies retrieval to a user who is not a party', async () => {
      mockRepo.findOne.mockResolvedValueOnce({
        ...mockDoc,
        tenantId: 'tenant-5',
        sharedWith: ['tenant-9'],
      });
      await expect(service.findOne('doc-1', 'stranger')).rejects.toThrow(
        'Access denied',
      );
    });
  });

  describe('sign', () => {
    it('captures a signature from a party with a payload hash', async () => {
      const doc = {
        ...mockDoc,
        status: 'ACTIVE',
        tenantId: 'tenant-5',
        signatures: null,
      };
      mockRepo.findOne.mockResolvedValueOnce(doc);
      mockRepo.save.mockImplementationOnce((d: Document) => Promise.resolve(d));

      const result = await service.sign('doc-1', 'tenant-5', 'sig-payload');

      expect(result.signatures).toHaveLength(1);
      const signature = result.signatures![0];
      expect(signature.signerId).toBe('tenant-5');
      expect(signature.signatureData).toBe('sig-payload');
      expect(signature.payloadHash).toMatch(/^[0-9a-f]{64}$/);
      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ signatures: [signature] }),
      );
    });

    it('rejects a signer who is not a party to the document', async () => {
      mockRepo.findOne.mockResolvedValueOnce({
        ...mockDoc,
        status: 'ACTIVE',
        signatures: null,
      });
      await expect(
        service.sign('doc-1', 'stranger', 'sig-payload'),
      ).rejects.toThrow('Only parties to the document can sign it');
    });

    it('rejects a duplicate signature from the same signer', async () => {
      mockRepo.findOne.mockResolvedValueOnce({
        ...mockDoc,
        status: 'ACTIVE',
        signatures: null,
      });
      mockRepo.save.mockImplementationOnce((d: Document) => Promise.resolve(d));
      const signed = await service.sign('doc-1', 'user-1', 'sig-payload');

      mockRepo.findOne.mockResolvedValueOnce(signed);
      await expect(
        service.sign('doc-1', 'user-1', 'sig-payload-2'),
      ).rejects.toThrow('Document already signed by this user');
    });

    it('rejects signing an archived document', async () => {
      mockRepo.findOne.mockResolvedValueOnce({
        ...mockDoc,
        status: 'ARCHIVED',
        signatures: null,
      });
      await expect(
        service.sign('doc-1', 'user-1', 'sig-payload'),
      ).rejects.toThrow('Only active documents can be signed');
    });

    it('throws NotFoundException for a missing document', async () => {
      mockRepo.findOne.mockResolvedValueOnce(null);
      await expect(
        service.sign('missing', 'user-1', 'sig-payload'),
      ).rejects.toThrow('Document not found');
    });
  });

  describe('signature payload integrity', () => {
    async function signedDocument(): Promise<Document> {
      const doc = {
        ...mockDoc,
        status: 'ACTIVE',
        signatures: null,
      } as Document;
      mockRepo.findOne.mockResolvedValueOnce(doc);
      mockRepo.save.mockImplementationOnce((d: Document) => Promise.resolve(d));
      return service.sign('doc-1', 'user-1', 'sig-payload');
    }

    it('verifies an untampered signature as valid', async () => {
      const doc = await signedDocument();
      mockRepo.findOne.mockResolvedValueOnce(doc);

      const verification = await service.verifySignatures('doc-1', 'user-1');

      expect(verification.signatureCount).toBe(1);
      expect(verification.allValid).toBe(true);
      expect(verification.signatures[0]).toEqual(
        expect.objectContaining({ signerId: 'user-1', valid: true }),
      );
    });

    it('detects tampering when the file reference changes after signing', async () => {
      const doc = await signedDocument();
      mockRepo.findOne.mockResolvedValueOnce({
        ...doc,
        fileKey: 'docs/user/swapped.pdf',
      });

      const verification = await service.verifySignatures('doc-1', 'user-1');

      expect(verification.allValid).toBe(false);
      expect(verification.signatures[0].valid).toBe(false);
    });

    it('detects tampering with the stored signature payload', async () => {
      const doc = await signedDocument();
      const tampered = {
        ...doc,
        signatures: [
          { ...doc.signatures![0], signatureData: 'forged-payload' },
        ],
      };
      mockRepo.findOne.mockResolvedValueOnce(tampered);

      const verification = await service.verifySignatures('doc-1', 'user-1');

      expect(verification.allValid).toBe(false);
      expect(verification.signatures[0].valid).toBe(false);
    });

    it('reports an unsigned document as not fully signed', async () => {
      mockRepo.findOne.mockResolvedValueOnce({
        ...mockDoc,
        status: 'ACTIVE',
        signatures: null,
      });

      const verification = await service.verifySignatures('doc-1', 'user-1');

      expect(verification.signatureCount).toBe(0);
      expect(verification.allValid).toBe(false);
    });

    it('denies verification to a user who is not a party', async () => {
      mockRepo.findOne.mockResolvedValueOnce({
        ...mockDoc,
        status: 'ACTIVE',
        signatures: null,
      });
      await expect(
        service.verifySignatures('doc-1', 'stranger'),
      ).rejects.toThrow('Access denied');
    });
  });
});
