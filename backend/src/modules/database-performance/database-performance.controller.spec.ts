import { Test, TestingModule } from '@nestjs/testing';
import { DatabasePerformanceController } from './database-performance.controller';
import { DatabasePerformanceService } from './database-performance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

describe('DatabasePerformanceController', () => {
  let controller: DatabasePerformanceController;
  let service: DatabasePerformanceService;

  beforeEach(async () => {
    const mockService = {
      getPerformanceReport: jest
        .fn()
        .mockResolvedValue({ generatedAt: '2023-01-01' }),
      getSlowQueries: jest.fn().mockResolvedValue([]),
      getIndexUsage: jest.fn().mockResolvedValue([]),
      getQueryAnalysis: jest.fn().mockResolvedValue({
        generatedAt: '2023-01-01',
        summary: {},
      }),
      getNPlusOneDetection: jest.fn().mockResolvedValue({
        generatedAt: '2023-01-01',
        totalDetected: 0,
        reports: [],
        summary: { critical: 0, high: 0, medium: 0, low: 0 },
      }),
      getQueryPatterns: jest.fn().mockResolvedValue([]),
      getQueryHistory: jest.fn().mockResolvedValue([]),
      getQueryStats: jest.fn().mockResolvedValue({}),
      resetQueryAnalysis: jest
        .fn()
        .mockResolvedValue({
          message: 'Query analysis data reset successfully',
        }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DatabasePerformanceController],
      providers: [
        {
          provide: DatabasePerformanceService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<DatabasePerformanceController>(
      DatabasePerformanceController,
    );
    service = module.get<DatabasePerformanceService>(
      DatabasePerformanceService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return performance report', async () => {
    const result = await controller.getPerformanceReport();
    expect(result).toEqual({ generatedAt: '2023-01-01' });
    expect(service.getPerformanceReport).toHaveBeenCalled();
  });

  it('should return slow queries', async () => {
    const result = await controller.getSlowQueries();
    expect(result).toEqual([]);
    expect(service.getSlowQueries).toHaveBeenCalledWith(20);
  });

  it('should return query analysis', async () => {
    const result = await controller.getQueryAnalysis();
    expect(result).toEqual({ generatedAt: '2023-01-01', summary: {} });
    expect(service.getQueryAnalysis).toHaveBeenCalled();
  });

  it('should return N+1 detection', async () => {
    const result = await controller.getNPlusOneDetection();
    expect(result).toBeDefined();
    expect(service.getNPlusOneDetection).toHaveBeenCalledWith(undefined);
  });

  it('should return query patterns', async () => {
    const result = await controller.getQueryPatterns();
    expect(result).toEqual([]);
    expect(service.getQueryPatterns).toHaveBeenCalledWith(undefined);
  });

  it('should return query history', async () => {
    const result = await controller.getQueryHistory('50');
    expect(result).toEqual([]);
    expect(service.getQueryHistory).toHaveBeenCalledWith(50, undefined);
  });

  it('should return query stats', async () => {
    const result = await controller.getQueryStats();
    expect(result).toEqual({});
    expect(service.getQueryStats).toHaveBeenCalled();
  });

  it('should reset query analysis', async () => {
    const result = await controller.resetQueryAnalysis();
    expect(result).toEqual({
      message: 'Query analysis data reset successfully',
    });
    expect(service.resetQueryAnalysis).toHaveBeenCalled();
  });
});
