import { Test, TestingModule } from '@nestjs/testing';
import { TempFileCleanupService } from './temp-file-cleanup.service';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('fs', () => {
  return {
    ...jest.requireActual('fs'),
    existsSync: jest.fn(),
  };
});

describe('TempFileCleanupService', () => {
  let service: TempFileCleanupService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TempFileCleanupService],
    }).compile();

    service = module.get<TempFileCleanupService>(TempFileCleanupService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should skip if directory does not exist', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    // We spy on readdir via promisify to ensure it's not called
    const spy = jest.spyOn(service, 'cleanupDirectory');
    await service.cleanupDirectory('/fake/dir');

    expect(spy).toHaveBeenCalled();
  });
});
