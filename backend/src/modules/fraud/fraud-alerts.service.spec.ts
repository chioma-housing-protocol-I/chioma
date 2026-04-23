import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { FraudAlertsService } from './fraud-alerts.service';
import { FraudAlertEntity } from './entities/fraud-alert.entity';

describe('FraudAlertsService', () => {
  let service: FraudAlertsService;

  const created = new Date('2026-01-01T00:00:00.000Z');

  const mockRepo = {
    create: jest.fn((v) => ({ id: 'alert-1', ...v })),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockRepo.save.mockImplementation(async (v) => ({
      ...v,
      createdAt: v.createdAt ?? created,
      updatedAt: v.updatedAt ?? created,
    }));
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FraudAlertsService,
        {
          provide: getRepositoryToken(FraudAlertEntity),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get(FraudAlertsService);
  });

  it('returns null when decision is allow', async () => {
    const result = await service.createAlert('user', 'user-1', {
      score: 10,
      decision: 'allow',
      reasons: [],
      features: {},
      modelVersion: 'v1',
    });
    expect(result).toBeNull();
    expect(mockRepo.save).not.toHaveBeenCalled();
  });

  it('persists alert for review decision', async () => {
    const result = await service.createAlert('user', 'user-1', {
      score: 55,
      decision: 'review',
      reasons: ['failedLoginAttempts'],
      features: { failedLoginAttempts: 0.9 },
      modelVersion: 'v1',
    });
    expect(mockRepo.create).toHaveBeenCalled();
    expect(mockRepo.save).toHaveBeenCalled();
    expect(result?.decision).toBe('review');
    expect(result?.subjectId).toBe('user-1');
  });

  it('lists alerts with optional status filter', async () => {
    mockRepo.find.mockResolvedValueOnce([
      {
        id: 'a1',
        subjectType: 'user',
        subjectId: 'u1',
        score: 60,
        decision: 'review',
        reasons: ['x'],
        modelVersion: 'v1',
        features: null,
        status: 'open',
        resolvedAt: null,
        createdAt: created,
        updatedAt: created,
      },
    ]);
    const rows = await service.listAlerts('open');
    expect(mockRepo.find).toHaveBeenCalledWith({
      where: { status: 'open' },
      order: { createdAt: 'DESC' },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].createdAt).toBe(created.toISOString());
  });

  it('resolveAlert throws when missing', async () => {
    mockRepo.findOne.mockResolvedValueOnce(null);
    await expect(service.resolveAlert('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('resolveAlert marks row resolved', async () => {
    const row = {
      id: 'a1',
      subjectType: 'listing',
      subjectId: 'l1',
      score: 80,
      decision: 'block',
      reasons: ['y'],
      modelVersion: 'v1',
      features: {},
      status: 'open',
      resolvedAt: null,
      createdAt: created,
      updatedAt: created,
    };
    mockRepo.findOne.mockResolvedValueOnce({ ...row });

    const out = await service.resolveAlert('a1');
    expect(mockRepo.save).toHaveBeenCalled();
    expect(out.status).toBe('resolved');
    expect(out.resolvedAt).toBeDefined();
  });
});
