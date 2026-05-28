import { Test, TestingModule } from '@nestjs/testing';

import { StorageService } from './storage.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FileMetadata } from './file-metadata.entity';
import { ImageProcessingService } from './image-processing.service';

jest.mock('@aws-sdk/client-s3', () => {
  const Actual = jest.requireActual('@aws-sdk/client-s3');
  return {
    ...Actual,
    S3Client: jest.fn().mockImplementation(() => ({
      send: jest.fn(),
    })),
  };
});

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(async () => 'https://signed-url.example.com'),
}));

const mockRepo = () => ({
  save: jest.fn(),
  findOne: jest.fn(),
  delete: jest.fn(),
});

const mockImageProcessing = () => ({
  processImage: jest.fn(),
  getImageMetadata: jest.fn(),
});

describe('StorageService', () => {
  let service: StorageService;
  let repo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        {
          provide: getRepositoryToken(FileMetadata),
          useFactory: mockRepo,
        },
        {
          provide: ImageProcessingService,
          useFactory: mockImageProcessing,
        },
      ],
    }).compile();
    service = module.get<StorageService>(StorageService);
    repo = module.get(getRepositoryToken(FileMetadata));
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
        60 * 1024 * 1024,
      ),
    ).rejects.toThrow('File too large');
  });

  it('should generate and store a signed upload URL for valid files', async () => {
    const result = await service.getUploadUrl(
      'docs/owner/file.pdf',
      'application/pdf',
      'owner',
      'file.pdf',
      1024,
    );

    expect(result).toContain('https://');
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: 'file.pdf',
        fileSize: 1024,
        fileType: 'application/pdf',
        s3Key: 'docs/owner/file.pdf',
        ownerId: 'owner',
      }),
    );
  });

  it('should upload a generic document buffer and save metadata', async () => {
    const sendSpy = jest.spyOn(service['s3'], 'send');

    const result = await service.uploadBuffer(
      Buffer.from('test content'),
      'docs/owner/file.pdf',
      'application/pdf',
      'owner',
      'file.pdf',
    );

    expect(sendSpy).toHaveBeenCalled();
    expect(result.url).toContain('https://');
    expect(result.variants).toEqual({});
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: 'file.pdf',
        fileSize: 12,
        fileType: 'application/pdf',
        s3Key: 'docs/owner/file.pdf',
        ownerId: 'owner',
      }),
    );
  });

  it('should upload original file when image processing fails', async () => {
    jest
      .spyOn(service['imageProcessing'] as any, 'processImage')
      .mockRejectedValue(new Error('processing failed'));
    const sendSpy = jest.spyOn(service['s3'], 'send');

    const result = await service.uploadBuffer(
      Buffer.from('image data'),
      'images/owner/file.png',
      'image/png',
      'owner',
      'file.png',
    );

    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(result.url).toContain('https://');
    expect(result.variants).toEqual({});
  });

  it('should return CDN download URL when CDN is configured', async () => {
    service['cdnBaseUrl'] = 'https://cdn.example.com';
    repo.findOne.mockResolvedValue({
      s3Key: 'docs/owner/file.pdf',
      ownerId: 'owner',
    });

    const result = await service.getDownloadUrl('docs/owner/file.pdf', 'owner');

    expect(result).toBe('https://cdn.example.com/docs/owner/file.pdf');
  });

  it('should delete a file and remove metadata when found', async () => {
    repo.findOne.mockResolvedValue({
      s3Key: 'docs/owner/file.pdf',
      ownerId: 'owner',
    });
    jest.spyOn(service['s3'], 'send');

    await service.deleteFile('docs/owner/file.pdf', 'owner');

    expect(service['s3'].send).toHaveBeenCalled();
    expect(repo.delete).toHaveBeenCalledWith({
      s3Key: 'docs/owner/file.pdf',
      ownerId: 'owner',
    });
  });

  it('should throw when deleting a missing file', async () => {
    repo.findOne.mockResolvedValue(null);

    await expect(
      service.deleteFile('docs/owner/file.pdf', 'owner'),
    ).rejects.toThrow('File not found or access denied');
  });

  it('should throw if download file not found', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.getDownloadUrl('key', 'owner')).rejects.toThrow(
      'File not found or access denied',
    );
  });
});
