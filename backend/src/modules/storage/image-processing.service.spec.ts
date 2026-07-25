import { ImageProcessingService } from './image-processing.service';

jest.mock('sharp', () => {
  const chain = {
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    webp: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('processed')),
    metadata: jest.fn().mockResolvedValue({
      width: 100,
      height: 100,
      format: 'jpeg',
    }),
  };
  return jest.fn(() => chain);
});

describe('ImageProcessingService cache (issue #1408)', () => {
  let service: ImageProcessingService;
  const originalMax = process.env.IMAGE_CACHE_MAX_SIZE;

  beforeEach(() => {
    process.env.IMAGE_CACHE_MAX_SIZE = '2';
    service = new ImageProcessingService();
    service.clearCache();
  });

  afterAll(() => {
    if (originalMax === undefined) {
      delete process.env.IMAGE_CACHE_MAX_SIZE;
    } else {
      process.env.IMAGE_CACHE_MAX_SIZE = originalMax;
    }
  });

  it('caches variants by SHA-256 content hash and reports a hit on duplicate bytes', async () => {
    const buffer = Buffer.from('same-image-bytes');

    const first = await service.processImage(
      buffer,
      'uploads/a.jpg',
      'image/jpeg',
    );
    const second = await service.processImage(
      buffer,
      'uploads/b.jpg',
      'image/jpeg',
    );

    expect(first.thumbnail.buffer).toEqual(second.thumbnail.buffer);
    expect(second.thumbnail.key).toBe('uploads/b_thumb.jpg');

    const metrics = service.getCacheMetrics();
    expect(metrics.misses).toBe(1);
    expect(metrics.hits).toBe(1);
    expect(metrics.hitRate).toBe(0.5);
    expect(metrics.missRate).toBe(0.5);
    expect(metrics.size).toBe(1);
  });

  it('evicts least-recently used entries when capacity is exceeded', async () => {
    await service.processImage(
      Buffer.from('img-1'),
      'uploads/1.jpg',
      'image/jpeg',
    );
    await service.processImage(
      Buffer.from('img-2'),
      'uploads/2.jpg',
      'image/jpeg',
    );
    // Capacity is 2; third unique hash should evict the LRU (img-1)
    await service.processImage(
      Buffer.from('img-3'),
      'uploads/3.jpg',
      'image/jpeg',
    );

    const metrics = service.getCacheMetrics();
    expect(metrics.size).toBe(2);
    expect(metrics.evictions).toBe(1);
    expect(metrics.maxSize).toBe(2);

    // Reprocessing img-1 after eviction is a miss again
    await service.processImage(
      Buffer.from('img-1'),
      'uploads/1-again.jpg',
      'image/jpeg',
    );
    expect(service.getCacheMetrics().misses).toBe(4);
  });

  it('rejects non-image content types before caching', async () => {
    await expect(
      service.processImage(Buffer.from('pdf'), 'doc.pdf', 'application/pdf'),
    ).rejects.toThrow('Not an image file');
    expect(service.getCacheMetrics().hits + service.getCacheMetrics().misses).toBe(
      0,
    );
  });
});
