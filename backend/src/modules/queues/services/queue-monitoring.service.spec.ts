import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import { MetricsService } from '../../monitoring/metrics.service';
import { AlertService } from '../../monitoring/alert.service';
import {
  DEFAULT_STALLED_QUEUE_THRESHOLD_SECONDS,
  QueueMonitoringService,
} from './queue-monitoring.service';

type MockQueue = {
  getJobCounts: jest.Mock;
  isPaused: jest.Mock;
  getWaiting: jest.Mock;
};

const healthyCounts = {
  active: 0,
  wait: 0,
  delayed: 0,
  failed: 0,
  completed: 0,
};

function makeQueue(): MockQueue {
  return {
    getJobCounts: jest.fn().mockResolvedValue({ ...healthyCounts }),
    isPaused: jest.fn().mockResolvedValue(false),
    getWaiting: jest.fn().mockResolvedValue([]),
  };
}

describe('QueueMonitoringService', () => {
  let service: QueueMonitoringService;
  let emailQueue: MockQueue;
  let metricsService: { setQueueMetrics: jest.Mock };
  let alertService: { handleAlert: jest.Mock };
  let configGet: jest.Mock;

  async function buildService(): Promise<void> {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueMonitoringService,
        { provide: getQueueToken('email'), useValue: emailQueue },
        { provide: getQueueToken('documents'), useValue: makeQueue() },
        { provide: getQueueToken('blockchain'), useValue: makeQueue() },
        { provide: getQueueToken('data-sync'), useValue: makeQueue() },
        { provide: MetricsService, useValue: metricsService },
        { provide: AlertService, useValue: alertService },
        { provide: ConfigService, useValue: { get: configGet } },
      ],
    }).compile();

    service = module.get(QueueMonitoringService);
  }

  beforeEach(async () => {
    emailQueue = makeQueue();
    metricsService = { setQueueMetrics: jest.fn() };
    alertService = { handleAlert: jest.fn().mockResolvedValue(undefined) };
    configGet = jest.fn((_key: string, defaultValue?: unknown) => defaultValue);
    await buildService();
  });

  it('exports depth, oldest-job age, active and failed gauges per queue', async () => {
    const now = Date.now();
    emailQueue.getJobCounts.mockResolvedValue({
      active: 2,
      wait: 3,
      delayed: 1,
      failed: 4,
      completed: 10,
    });
    emailQueue.getWaiting.mockResolvedValue([
      { timestamp: now - 20_000 },
      { timestamp: now - 45_000 },
    ]);

    await service.collectMetrics();

    expect(metricsService.setQueueMetrics).toHaveBeenCalledWith(
      'email',
      expect.objectContaining({
        depth: 4, // waiting (3) + delayed (1)
        active: 2,
        failed: 4,
        paused: false,
        stalled: false,
      }),
    );
    const emailCall = metricsService.setQueueMetrics.mock.calls.find(
      ([queue]) => queue === 'email',
    );
    expect(emailCall[1].oldestJobAgeSeconds).toBeGreaterThanOrEqual(44);
    expect(emailCall[1].oldestJobAgeSeconds).toBeLessThanOrEqual(46);

    // Every configured queue is exported on the metrics endpoint path.
    const exported = metricsService.setQueueMetrics.mock.calls.map(
      ([queue]) => queue,
    );
    expect(exported).toEqual(
      expect.arrayContaining(['email', 'documents', 'blockchain', 'data-sync']),
    );
  });

  it('accepts the alternative `waiting` job-count key', async () => {
    emailQueue.getJobCounts.mockResolvedValue({
      active: 0,
      waiting: 7,
      delayed: 0,
      failed: 0,
      completed: 0,
    });

    await service.collectMetrics();

    expect(metricsService.setQueueMetrics).toHaveBeenCalledWith(
      'email',
      expect.objectContaining({ depth: 7 }),
    );
  });

  it('reports zero oldest-job age when nothing is waiting', async () => {
    await service.collectMetrics();

    expect(metricsService.setQueueMetrics).toHaveBeenCalledWith(
      'email',
      expect.objectContaining({ oldestJobAgeSeconds: 0, depth: 0 }),
    );
  });

  it('fires a QueueStalled alert when the oldest job exceeds the threshold', async () => {
    emailQueue.getJobCounts.mockResolvedValue({
      active: 0,
      wait: 5,
      delayed: 0,
      failed: 0,
      completed: 0,
    });
    emailQueue.getWaiting.mockResolvedValue([
      {
        timestamp:
          Date.now() - (DEFAULT_STALLED_QUEUE_THRESHOLD_SECONDS + 60) * 1000,
      },
    ]);

    await service.collectMetrics();

    expect(metricsService.setQueueMetrics).toHaveBeenCalledWith(
      'email',
      expect.objectContaining({ stalled: true }),
    );
    expect(alertService.handleAlert).toHaveBeenCalledTimes(1);
    expect(alertService.handleAlert).toHaveBeenCalledWith({
      alerts: [
        expect.objectContaining({
          status: 'firing',
          labels: expect.objectContaining({
            alertname: 'QueueStalled',
            severity: 'critical',
            queue: 'email',
          }),
        }),
      ],
    });
  });

  it('does not re-fire while the queue remains stalled', async () => {
    emailQueue.getJobCounts.mockResolvedValue({
      active: 0,
      wait: 5,
      delayed: 0,
      failed: 0,
      completed: 0,
    });
    emailQueue.getWaiting.mockResolvedValue([
      {
        timestamp:
          Date.now() - (DEFAULT_STALLED_QUEUE_THRESHOLD_SECONDS + 60) * 1000,
      },
    ]);

    await service.collectMetrics();
    await service.collectMetrics();

    const firing = alertService.handleAlert.mock.calls.filter(
      ([payload]) => payload.alerts[0].status === 'firing',
    );
    expect(firing).toHaveLength(1);
  });

  it('resolves the alert when the queue drains', async () => {
    emailQueue.getJobCounts.mockResolvedValue({
      active: 0,
      wait: 5,
      delayed: 0,
      failed: 0,
      completed: 0,
    });
    emailQueue.getWaiting.mockResolvedValue([
      {
        timestamp:
          Date.now() - (DEFAULT_STALLED_QUEUE_THRESHOLD_SECONDS + 60) * 1000,
      },
    ]);
    await service.collectMetrics();

    emailQueue.getJobCounts.mockResolvedValue({ ...healthyCounts });
    emailQueue.getWaiting.mockResolvedValue([]);
    await service.collectMetrics();

    expect(alertService.handleAlert).toHaveBeenLastCalledWith({
      alerts: [
        expect.objectContaining({
          status: 'resolved',
          labels: expect.objectContaining({
            alertname: 'QueueStalled',
            queue: 'email',
          }),
        }),
      ],
    });
    expect(metricsService.setQueueMetrics).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({ stalled: false }),
    );
  });

  it('does not alert for a healthy queue', async () => {
    emailQueue.getJobCounts.mockResolvedValue({
      active: 1,
      wait: 2,
      delayed: 0,
      failed: 0,
      completed: 5,
    });
    emailQueue.getWaiting.mockResolvedValue([
      { timestamp: Date.now() - 10_000 },
    ]);

    await service.collectMetrics();

    expect(alertService.handleAlert).not.toHaveBeenCalled();
  });

  it('honours a configured stall threshold', async () => {
    configGet = jest.fn((key: string, def?: unknown) =>
      key === 'STALLED_QUEUE_THRESHOLD_SECONDS' ? 30 : def,
    );
    await buildService();

    emailQueue.getJobCounts.mockResolvedValue({
      active: 0,
      wait: 1,
      delayed: 0,
      failed: 0,
      completed: 0,
    });
    // 60s old: beyond the configured 30s but far below the 300s default.
    emailQueue.getWaiting.mockResolvedValue([
      { timestamp: Date.now() - 60_000 },
    ]);

    await service.collectMetrics();

    expect(alertService.handleAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        alerts: [expect.objectContaining({ status: 'firing' })],
      }),
    );
  });

  it('keeps collecting for other queues when one queue errors', async () => {
    emailQueue.getJobCounts.mockRejectedValue(new Error('redis down'));

    await service.collectMetrics();

    const exported = metricsService.setQueueMetrics.mock.calls.map(
      ([queue]) => queue,
    );
    expect(exported).not.toContain('email');
    expect(exported).toEqual(
      expect.arrayContaining(['documents', 'blockchain', 'data-sync']),
    );
  });
});
