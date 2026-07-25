import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { StatusService } from './status.service';

describe('StatusService', () => {
  let service: StatusService;
  let dataSource: { query: jest.Mock };

  async function build() {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StatusService, { provide: DataSource, useValue: dataSource }],
    }).compile();
    return module.get<StatusService>(StatusService);
  }

  beforeEach(async () => {
    dataSource = { query: jest.fn().mockResolvedValue([{ '?column?': 1 }]) };
    service = await build();
  });

  it('reports operational status when the database responds', async () => {
    const page = await service.getStatusPage();

    expect(page.status).toBe('operational');
    expect(page.components.find((c) => c.name === 'database')?.status).toBe(
      'operational',
    );
    expect(page.components.find((c) => c.name === 'api')?.status).toBe(
      'operational',
    );
    expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
  });

  it('reports a major outage when the database check fails', async () => {
    dataSource.query.mockRejectedValueOnce(new Error('connection refused'));

    const page = await service.getStatusPage();

    expect(page.status).toBe('major_outage');
    expect(page.components.find((c) => c.name === 'database')?.status).toBe(
      'major_outage',
    );
  });

  it('reports uptime since service start', () => {
    const uptime = service.getUptime();
    expect(uptime.seconds).toBeGreaterThanOrEqual(0);
    expect(typeof uptime.since).toBe('string');
    expect(uptime.processSeconds).toBeGreaterThanOrEqual(0);
  });
});
