import { Test, TestingModule } from '@nestjs/testing';

import { StorageService } from './storage.service';
import { FileMetadataRepository } from './file-metadata.repository';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FileMetadata } from './file-metadata.entity';

jest.mock('@aws-sdk/client-s3', () => {
  const Actual = jest.requireActual('@aws-sdk/client-s3');
  return {
    ...Actual,
    S3Client: jest.fn().mockImplementation(() => ({
      send: jest.fn(),
    })),
  };
});

const mockRepo = () => ({
  save: jest.fn(),
  findOne: jest.fn(),
});

describe('StorageService', () => {
  let service: StorageService;
  let repo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        {
          provide: getRepositoryToken(FileMetadataRepository),
          useFactory: mockRepo,
        },
      ],
    }).compile();
    service = module.get<StorageService>(StorageService);
    repo = module.get(getRepositoryToken(FileMetadataRepository));
  });

  it('should throw on invalid file type', async () => {
    await expect(
      service.getUploadUrl(
        'key',
        'application/x-msdownload',
        'owner',
        'file.exe',
        1000,
      ),
    ).rejects.toThrow('Invalid file type');
  });

  it('should throw on file too large', async () => {
    await expect(
      service.getUploadUrl(
        'key',
        'image/png',
        'owner',
        'file.png',
        20 * 1024 * 1024,
      ),
    ).rejects.toThrow('File too large');
  });

  it('should throw if download file not found', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.getDownloadUrl('key', 'owner')).rejects.toThrow(
      'File not found or access denied',
    );
  });
});
