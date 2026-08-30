import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { QueryThresholdConfig } from './query-threshold.config';

describe('QueryThresholdConfig', () => {
  const build = async (env: Record<string, string | undefined>) => {
    const configService = {
      get: jest.fn((key: string) => env[key]),
    } as unknown as ConfigService;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueryThresholdConfig,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    return module.get<QueryThresholdConfig>(QueryThresholdConfig);
  };

  it('defaults to 200ms when nothing is configured', async () => {
    const config = await build({});

    expect(config.defaultThreshold).toBe(200);
    expect(config.thresholdFor('SELECT * FROM users')).toBe(200);
  });

  it('reads the default threshold from QUERY_ANALYSIS_SLOW_THRESHOLD_MS', async () => {
    const config = await build({ QUERY_ANALYSIS_SLOW_THRESHOLD_MS: '500' });

    expect(config.defaultThreshold).toBe(500);
  });

  it('applies a per-query-class override when configured', async () => {
    const config = await build({
      QUERY_ANALYSIS_SLOW_THRESHOLD_MS: '200',
      QUERY_ANALYSIS_SLOW_THRESHOLD_OVERRIDES_MS: JSON.stringify({
        select: 100,
        insert: 400,
      }),
    });

    expect(config.thresholdFor('SELECT * FROM properties')).toBe(100);
    expect(config.thresholdFor('INSERT INTO properties VALUES (1)')).toBe(400);
    // UPDATE has no override, falls back to the default.
    expect(config.thresholdFor('UPDATE properties SET title = 1')).toBe(200);
  });

  it('classifies queries by their leading SQL keyword', async () => {
    const config = await build({});

    expect(config.classify('  select 1')).toBe('select');
    expect(config.classify('INSERT INTO t VALUES (1)')).toBe('insert');
    expect(config.classify('update t set a = 1')).toBe('update');
    expect(config.classify('DELETE FROM t')).toBe('delete');
    expect(config.classify('BEGIN')).toBe('other');
  });

  it('ignores an unparsable overrides value and falls back to the default', async () => {
    const config = await build({
      QUERY_ANALYSIS_SLOW_THRESHOLD_MS: '200',
      QUERY_ANALYSIS_SLOW_THRESHOLD_OVERRIDES_MS: 'not-json',
    });

    expect(config.thresholdFor('SELECT 1')).toBe(200);
  });

  it('ignores an unknown query class in the overrides', async () => {
    const config = await build({
      QUERY_ANALYSIS_SLOW_THRESHOLD_OVERRIDES_MS: JSON.stringify({
        select: 100,
        merge: 999,
      }),
    });

    expect(config.thresholdForClass('select')).toBe(100);
    expect(config.defaultThreshold).toBe(200);
  });

  it('ignores a negative or non-numeric override value', async () => {
    const config = await build({
      QUERY_ANALYSIS_SLOW_THRESHOLD_OVERRIDES_MS: JSON.stringify({
        select: -50,
        insert: 'not-a-number',
      }),
    });

    expect(config.thresholdForClass('select')).toBe(200);
    expect(config.thresholdForClass('insert')).toBe(200);
  });
});
