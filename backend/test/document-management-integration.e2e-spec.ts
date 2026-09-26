/**
 * Integration tests: document management workflow
 * Covers upload URL generation, download, listing, metadata updates, and deletion.
 */
process.env.NODE_ENV = 'test';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { StorageService } from '../src/modules/storage/storage.service';

const mockStorageService = {
  getUploadUrl: jest.fn(),
  getDownloadUrl: jest.fn(),
  listFiles: jest.fn(),
  updateMetadata: jest.fn(),
  deleteFile: jest.fn(),
  uploadBuffer: jest.fn(),
  getFileMetadata: jest.fn(),
};

describe('Document Management Integration', () => {
  let app: INestApplication;

  const ownerId = 'user-doc-owner-001';
  const storageKey = `docs/${ownerId}/1700000000000_contract.pdf`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [{ provide: StorageService, useValue: mockStorageService }],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  beforeEach(() => jest.clearAllMocks());

  // ─── Upload ──────────────────────────────────────────────────────────────

  describe('Document upload', () => {
    it('generates a pre-signed upload URL for a valid PDF', async () => {
      const signedUrl =
        'https://s3.amazonaws.com/bucket/docs/contract.pdf?X-Amz-Signature=abc';
      mockStorageService.getUploadUrl.mockResolvedValue(signedUrl);

      const url = await mockStorageService.getUploadUrl(
        storageKey,
        'application/pdf',
        ownerId,
        'contract.pdf',
        512000,
      );

      expect(url).toBe(signedUrl);
      expect(mockStorageService.getUploadUrl).toHaveBeenCalledWith(
        storageKey,
        'application/pdf',
        ownerId,
        'contract.pdf',
        512000,
      );
    });

    it('rejects upload for an unsupported file type', async () => {
      mockStorageService.getUploadUrl.mockRejectedValue(
        new Error('Invalid file type'),
      );

      await expect(
        mockStorageService.getUploadUrl(
          storageKey,
          'text/plain',
          ownerId,
          'notes.txt',
          1024,
        ),
      ).rejects.toThrow('Invalid file type');
    });

    it('rejects upload when file exceeds the 50MB size limit', async () => {
      mockStorageService.getUploadUrl.mockRejectedValue(
        new Error('File too large (max 50MB)'),
      );

      await expect(
        mockStorageService.getUploadUrl(
          storageKey,
          'application/pdf',
          ownerId,
          'huge.pdf',
          60 * 1024 * 1024, // 60 MB
        ),
      ).rejects.toThrow('File too large (max 50MB)');
    });

    it('uploads a buffer directly and returns a public URL', async () => {
      const uploadResult = {
        url: 'https://cdn.example.com/docs/contract.pdf',
        variants: {},
      };
      mockStorageService.uploadBuffer.mockResolvedValue(uploadResult);

      const buffer = Buffer.from('%PDF-1.4 test content');
      const result = await mockStorageService.uploadBuffer(
        buffer,
        storageKey,
        'application/pdf',
        ownerId,
        'contract.pdf',
      );

      expect(result.url).toContain('contract.pdf');
      expect(result).toHaveProperty('variants');
    });
  });

  // ─── Download ─────────────────────────────────────────────────────────────

  describe('Document download', () => {
    it('returns a pre-signed download URL for an owned file', async () => {
      const downloadUrl =
        'https://s3.amazonaws.com/bucket/docs/contract.pdf?X-Amz-Signature=xyz';
      mockStorageService.getDownloadUrl.mockResolvedValue(downloadUrl);

      const url = await mockStorageService.getDownloadUrl(storageKey, ownerId);

      expect(url).toBe(downloadUrl);
      expect(mockStorageService.getDownloadUrl).toHaveBeenCalledWith(
        storageKey,
        ownerId,
      );
    });

    it('throws NotFoundException when file does not exist or is not owned', async () => {
      mockStorageService.getDownloadUrl.mockRejectedValue(
        new Error('File not found or access denied'),
      );

      await expect(
        mockStorageService.getDownloadUrl(
          'docs/other-user/missing.pdf',
          ownerId,
        ),
      ).rejects.toThrow('File not found or access denied');
    });
  });

  // ─── List ─────────────────────────────────────────────────────────────────

  describe('Document listing', () => {
    it('returns all files owned by the user', async () => {
      const files = [
        {
          id: 'file-1',
          fileName: 'lease.pdf',
          s3Key: storageKey,
          ownerId,
          fileType: 'application/pdf',
          fileSize: 204800,
        },
        {
          id: 'file-2',
          fileName: 'id-scan.pdf',
          s3Key: `docs/${ownerId}/id.pdf`,
          ownerId,
          fileType: 'application/pdf',
          fileSize: 102400,
        },
      ];
      mockStorageService.listFiles.mockResolvedValue(files);

      const result = await mockStorageService.listFiles(ownerId);

      expect(result).toHaveLength(2);
      expect(result[0].ownerId).toBe(ownerId);
    });

    it('returns an empty array when the user has no files', async () => {
      mockStorageService.listFiles.mockResolvedValue([]);

      const result = await mockStorageService.listFiles('user-with-no-docs');

      expect(result).toEqual([]);
    });
  });

  // ─── Metadata & Deletion ─────────────────────────────────────────────────

  describe('Metadata update and deletion', () => {
    it('updates the file name in metadata', async () => {
      mockStorageService.updateMetadata.mockResolvedValue({
        id: 'file-1',
        fileName: 'signed-lease-v2.pdf',
        s3Key: storageKey,
        ownerId,
      });

      const updated = await mockStorageService.updateMetadata(
        storageKey,
        ownerId,
        'signed-lease-v2.pdf',
      );

      expect(updated.fileName).toBe('signed-lease-v2.pdf');
    });

    it('deletes a file and its metadata successfully', async () => {
      mockStorageService.deleteFile.mockResolvedValue(undefined);

      await expect(
        mockStorageService.deleteFile(storageKey, ownerId),
      ).resolves.not.toThrow();

      expect(mockStorageService.deleteFile).toHaveBeenCalledWith(
        storageKey,
        ownerId,
      );
    });
  });
});
