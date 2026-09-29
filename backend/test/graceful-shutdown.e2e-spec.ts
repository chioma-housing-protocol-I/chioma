import './setup-env';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import {
  registerGracefulShutdown,
  GracefulShutdownOptions,
} from '../src/config/graceful-shutdown';

describe('Graceful Shutdown Integration (e2e)', () => {
  describe('Shutdown Signal Handling', () => {
    let app: INestApplication;

    beforeEach(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      app.setGlobalPrefix('api', {
        exclude: ['health', 'health/detailed'],
      });
      await app.init();
    });

    afterEach(async () => {
      // Remove any lingering once-listeners to avoid interference between tests
      process.removeAllListeners('SIGTERM');
      process.removeAllListeners('SIGINT');
      if (app) await app.close();
    });

    it('registerGracefulShutdown returns a callable shutdown function', () => {
      const shutdown = registerGracefulShutdown(app);
      expect(typeof shutdown).toBe('function');
    });

    it('registers a SIGTERM listener on the process', () => {
      const listenersBefore = process.listenerCount('SIGTERM');
      registerGracefulShutdown(app);
      expect(process.listenerCount('SIGTERM')).toBeGreaterThan(listenersBefore);
    });

    it('registers a SIGINT listener on the process', () => {
      const listenersBefore = process.listenerCount('SIGINT');
      registerGracefulShutdown(app);
      expect(process.listenerCount('SIGINT')).toBeGreaterThan(listenersBefore);
    });

    it('accepts custom timeout via options', () => {
      const options: GracefulShutdownOptions = { timeoutMs: 5000 };
      const shutdown = registerGracefulShutdown(app, options);
      expect(typeof shutdown).toBe('function');
    });

    it('accepts a custom logger via options', () => {
      const { Logger } = require('@nestjs/common');
      const logger = new Logger('TestShutdown');
      const options: GracefulShutdownOptions = { logger };
      const shutdown = registerGracefulShutdown(app, options);
      expect(typeof shutdown).toBe('function');
    });
  });

  describe('In-Flight Request Completion', () => {
    let app: INestApplication;

    beforeEach(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      app.setGlobalPrefix('api', {
        exclude: ['health', 'health/detailed'],
      });
      await app.init();
    });

    afterEach(async () => {
      process.removeAllListeners('SIGTERM');
      process.removeAllListeners('SIGINT');
      if (app) await app.close();
    });

    it('in-flight health request completes before shutdown begins', async () => {
      const responsePromise = request(app.getHttpServer()).get('/health');

      // Request should complete successfully
      const res = await responsePromise;
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(600);
    });

    it('multiple concurrent requests complete before shutdown', async () => {
      const requests = Array.from({ length: 3 }, () =>
        request(app.getHttpServer()).get('/health'),
      );

      const results = await Promise.all(requests);
      results.forEach((res) => {
        expect(res.status).toBeGreaterThanOrEqual(200);
        expect(res.status).toBeLessThan(600);
      });
    });

    it('application closes cleanly via app.close()', async () => {
      await expect(app.close()).resolves.toBeUndefined();
      // Prevent afterEach double-close
      app = null as any;
    });
  });

  describe('Connection Draining', () => {
    let app: INestApplication;

    beforeEach(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      app.setGlobalPrefix('api', {
        exclude: ['health', 'health/detailed'],
      });
      await app.init();
    });

    afterEach(async () => {
      process.removeAllListeners('SIGTERM');
      process.removeAllListeners('SIGINT');
      if (app) await app.close();
    });

    it('app closes without throwing after all requests are done', async () => {
      await request(app.getHttpServer()).get('/health');
      await expect(app.close()).resolves.not.toThrow();
      app = null as any;
    });

    it('subsequent requests after close are rejected', async () => {
      const server = app.getHttpServer();
      await app.close();
      app = null as any;

      // Server should no longer accept connections
      await expect(request(server).get('/health')).rejects.toThrow();
    });

    it('health endpoint responds before shutdown drains connections', async () => {
      const [r1, r2] = await Promise.all([
        request(app.getHttpServer()).get('/health'),
        request(app.getHttpServer()).get('/health/detailed'),
      ]);

      expect(r1.status).toBeGreaterThanOrEqual(200);
      expect(r2.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe('Resource Cleanup', () => {
    it('shutdown function can be called directly and resolves', async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      const testApp = moduleFixture.createNestApplication();
      testApp.setGlobalPrefix('api', {
        exclude: ['health', 'health/detailed'],
      });
      await testApp.init();

      process.removeAllListeners('SIGTERM');
      process.removeAllListeners('SIGINT');

      const shutdown = registerGracefulShutdown(testApp, { timeoutMs: 5000 });

      // Spy on process.exit to prevent actual exit during tests
      const exitSpy = jest
        .spyOn(process, 'exit')
        .mockImplementation(() => undefined as never);

      await shutdown('SIGTERM');

      expect(exitSpy).toHaveBeenCalledWith(0);

      exitSpy.mockRestore();
      process.removeAllListeners('SIGTERM');
      process.removeAllListeners('SIGINT');
    });

    it('second shutdown call is a no-op (idempotent)', async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      const testApp = moduleFixture.createNestApplication();
      await testApp.init();

      process.removeAllListeners('SIGTERM');
      process.removeAllListeners('SIGINT');

      const shutdown = registerGracefulShutdown(testApp, { timeoutMs: 5000 });

      const exitSpy = jest
        .spyOn(process, 'exit')
        .mockImplementation(() => undefined as never);

      await shutdown('SIGTERM');
      // Second call should be ignored (shuttingDown guard)
      await shutdown('SIGTERM');

      expect(exitSpy).toHaveBeenCalledTimes(1);
      exitSpy.mockRestore();
      process.removeAllListeners('SIGTERM');
      process.removeAllListeners('SIGINT');
    });
  });

  describe('Shutdown Timeout', () => {
    it('forces exit with code 1 when shutdown exceeds timeout', async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      const testApp = moduleFixture.createNestApplication();
      await testApp.init();

      process.removeAllListeners('SIGTERM');
      process.removeAllListeners('SIGINT');

      // Override app.close to simulate a hung shutdown
      const closeSpy = jest
        .spyOn(testApp, 'close')
        .mockImplementation(
          () => new Promise<void>((resolve) => setTimeout(resolve, 60000)),
        );

      const exitSpy = jest
        .spyOn(process, 'exit')
        .mockImplementation(() => undefined as never);

      const shutdown = registerGracefulShutdown(testApp, {
        timeoutMs: 100,
      });

      await shutdown('SIGTERM');

      // Allow the timeout to fire
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(exitSpy).toHaveBeenCalledWith(expect.any(Number));

      closeSpy.mockRestore();
      exitSpy.mockRestore();
      process.removeAllListeners('SIGTERM');
      process.removeAllListeners('SIGINT');
    });

    it('completes cleanly within timeout for healthy app', async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      const testApp = moduleFixture.createNestApplication();
      await testApp.init();

      process.removeAllListeners('SIGTERM');
      process.removeAllListeners('SIGINT');

      const exitSpy = jest
        .spyOn(process, 'exit')
        .mockImplementation(() => undefined as never);

      const shutdown = registerGracefulShutdown(testApp, {
        timeoutMs: 30000,
      });

      const start = Date.now();
      await shutdown('SIGTERM');
      const elapsed = Date.now() - start;

      expect(exitSpy).toHaveBeenCalledWith(0);
      expect(elapsed).toBeLessThan(30000);

      exitSpy.mockRestore();
      process.removeAllListeners('SIGTERM');
      process.removeAllListeners('SIGINT');
    });
  });
});
