import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HealthCheckError } from '@nestjs/terminus';
import { ElasticsearchHealthIndicator } from './elasticsearch.indicator';

describe('ElasticsearchHealthIndicator', () => {
  let indicator: ElasticsearchHealthIndicator;
  let mockConfigService: Partial<ConfigService>;
  let fetchSpy: jest.SpyInstance;

  const buildModule = async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ElasticsearchHealthIndicator,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    return module.get<ElasticsearchHealthIndicator>(
      ElasticsearchHealthIndicator,
    );
  };

  afterEach(() => {
    fetchSpy?.mockRestore();
  });

  describe('when Elasticsearch is not configured', () => {
    beforeEach(async () => {
      mockConfigService = { get: jest.fn().mockReturnValue(undefined) };
      indicator = await buildModule();
    });

    it('should return a skipped status without calling fetch', async () => {
      fetchSpy = jest.spyOn(global, 'fetch');

      const result = await indicator.isHealthy('elasticsearch');

      expect(result).toMatchObject({
        elasticsearch: { status: 'skipped' },
      });
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('when Elasticsearch is configured', () => {
    beforeEach(async () => {
      mockConfigService = {
        get: jest.fn((key: string, def?: unknown) => {
          if (key === 'ELASTICSEARCH_URL') return 'http://localhost:9200';
          return def;
        }),
      };
      indicator = await buildModule();
    });

    it('should return up for a green cluster', async () => {
      fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          cluster_name: 'chioma',
          status: 'green',
          number_of_nodes: 1,
          active_shards: 2,
          unassigned_shards: 0,
        }),
      } as Response);

      const result = await indicator.isHealthy('elasticsearch');

      expect(result).toMatchObject({
        elasticsearch: {
          status: 'up',
          clusterStatus: 'green',
          clusterName: 'chioma',
        },
      });
    });

    it('should return warning for a red cluster', async () => {
      fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'red' }),
      } as Response);

      const result = await indicator.isHealthy('elasticsearch');

      expect(result).toMatchObject({
        elasticsearch: { status: 'warning', clusterStatus: 'red' },
      });
    });

    it('should throw HealthCheckError when the cluster is unreachable', async () => {
      fetchSpy = jest
        .spyOn(global, 'fetch')
        .mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(indicator.isHealthy('elasticsearch')).rejects.toThrow(
        HealthCheckError,
      );
    });

    it('should throw HealthCheckError on a non-ok HTTP response', async () => {
      fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({}),
      } as Response);

      await expect(indicator.isHealthy('elasticsearch')).rejects.toThrow(
        HealthCheckError,
      );
    });
  });
});
