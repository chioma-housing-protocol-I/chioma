import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import {
  SorobanClientService,
  SorobanHealthController,
} from './soroban-client.service';
import { BlockchainConnectionError } from '../errors/domain-errors';

describe('SorobanClientService', () => {
  let service: SorobanClientService;
  let app: INestApplication;
  const originalNodeEnv = process.env.NODE_ENV;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: unknown) => {
      if (key === 'SOROBAN_RPC_URL') return 'http://127.0.0.1:1';
      if (key === 'SOROBAN_CONNECT_ATTEMPTS') return 3;
      if (key === 'SOROBAN_CONNECT_BASE_DELAY_MS') return 0;
      if (key === 'CHIOMA_CONTRACT_ID') return '';
      if (key === 'STELLAR_NETWORK') return defaultValue ?? 'testnet';
      return defaultValue;
    }),
  };

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';
    const module = await Test.createTestingModule({
      controllers: [SorobanHealthController],
      providers: [
        SorobanClientService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get(SorobanClientService);
    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    process.env.NODE_ENV = originalNodeEnv;
    if (app) {
      await app.close();
    }
  });

  it('skips the live startup probe when NODE_ENV is test', () => {
    expect(service.isConnected()).toBe(false);
  });

  it('fails startup after retries when the RPC stays unreachable', async () => {
    const health = jest
      .spyOn(service.getServer(), 'getHealth')
      .mockRejectedValue(new Error('connection refused'));
    process.env.NODE_ENV = 'production';

    await expect(service.onModuleInit()).rejects.toBeInstanceOf(
      BlockchainConnectionError,
    );
    expect(health).toHaveBeenCalledTimes(3);
    expect(service.isConnected()).toBe(false);
  });

  it('connects after transient failures', async () => {
    const health = jest
      .spyOn(service.getServer(), 'getHealth')
      .mockRejectedValueOnce(new Error('timeout'))
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValue({ status: 'healthy' });
    process.env.NODE_ENV = 'production';

    await service.onModuleInit();

    expect(health).toHaveBeenCalledTimes(3);
    expect(service.isConnected()).toBe(true);
  });

  it('reports soroban health up and down', async () => {
    const health = jest.spyOn(service.getServer(), 'getHealth');
    health.mockResolvedValue({ status: 'healthy' });

    const up = await request(app.getHttpServer())
      .get('/health/soroban')
      .expect(200);
    expect(up.body.status).toBe('up');
    expect(up.body.rpcUrl).toBe('http://127.0.0.1:1');

    health.mockRejectedValue(new Error('rpc down'));
    const down = await request(app.getHttpServer())
      .get('/health/soroban')
      .expect(503);
    expect(down.body.status).toBe('down');
    expect(down.body.error).toBe('rpc down');
  });
});
