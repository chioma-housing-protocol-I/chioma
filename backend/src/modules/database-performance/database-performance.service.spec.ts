import { Test, TestingModule } from '@nestjs/testing';
import { DatabasePerformanceService } from './database-performance.service';
import { DataSource } from 'typeorm';

describe('DatabasePerformanceService', () => {
  let service: DatabasePerformanceService;
  let mockDataSource: Partial<DataSource>;

  beforeEach(async () => {
    mockDataSource = {
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabasePerformanceService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<DatabasePerformanceService>(
      DatabasePerformanceService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should get slow queries', async () => {
    const mockResult = [{ query: 'SELECT * FROM users', total_exec_time: 100 }];
    (mockDataSource.query as jest.Mock).mockResolvedValue(mockResult);

    const result = await service.getSlowQueries();
    expect(result).toEqual(mockResult);
    expect(mockDataSource.query).toHaveBeenCalledWith(
      expect.stringContaining('pg_stat_statements'),
      [10],
    );
  });

  it('should handle pg_stat_statements failure gracefully', async () => {
    (mockDataSource.query as jest.Mock).mockRejectedValue(
      new Error('relation "pg_stat_statements" does not exist'),
    );

    const result = await service.getSlowQueries();
    expect(result).toEqual([]);
  });

  it('should get index usage', async () => {
    const mockResult = [{ indexname: 'idx_1', index_scans: 5 }];
    (mockDataSource.query as jest.Mock).mockResolvedValue(mockResult);

    const result = await service.getIndexUsage();
    expect(result).toEqual(mockResult);
    expect(mockDataSource.query).toHaveBeenCalledWith(
      expect.stringContaining('pg_stat_user_indexes'),
    );
  });
});
