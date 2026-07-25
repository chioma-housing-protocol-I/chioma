/**
 * Comprehensive Performance Testing Suite
 * Tests critical endpoints under various load conditions and measures performance metrics
 * Run with: pnpm run test:e2e -- --testPathPattern=performance-comprehensive
 */
process.env.NODE_ENV = 'test';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { clearDatabase, getTestDatabaseConfig } from './test-helpers';
import { DataSource } from 'typeorm';
import { User } from '../src/modules/users/entities/user.entity';
import { Property } from '../src/modules/properties/entities/property.entity';
import { Payment } from '../src/modules/payments/entities/payment.entity';

interface PerformanceMetrics {
  endpoint: string;
  method: string;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  successRate: number;
  requestsPerSecond: number;
  totalRequests: number;
  errors: number;
}

interface LoadTestConfig {
  endpoint: string;
  method: string;
  payload?: any;
  headers?: Record<string, string>;
  concurrency: number;
  duration: number; // seconds
  expectedMaxP99: number; // milliseconds
  expectedMinRPS: number; // requests per second
}

describe('Comprehensive Performance Testing (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authToken: string;
  let testUser: User;
  let testProperty: Property;

  // Performance thresholds
  const PERFORMANCE_THRESHOLDS = {
    HEALTH_CHECK: { maxP99: 100, minRPS: 1000 },
    AUTH_LOGIN: { maxP99: 500, minRPS: 100 },
    PROPERTY_LIST: { maxP99: 1000, minRPS: 50 },
    PROPERTY_CREATE: { maxP99: 2000, minRPS: 20 },
    PAYMENT_PROCESS: { maxP99: 3000, minRPS: 10 },
    SEARCH_PROPERTIES: { maxP99: 1500, minRPS: 30 },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    dataSource = moduleFixture.get(DataSource);

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    app.setGlobalPrefix('api', {
      exclude: ['health', 'health/detailed', 'security.txt', '.well-known'],
    });

    // Set up Swagger
    const config = new DocumentBuilder()
      .setTitle('Chioma API')
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'JWT-auth',
      )
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    await app.init();

    // Set up test data
    await setupTestData();
  }, 60000);

  afterAll(async () => {
    await clearDatabase(dataSource);
    if (app) {
      await app.close();
    }
  }, 60000);

  async function setupTestData() {
    // Create test user and get auth token
    const registerResponse = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'perf-test@example.com',
        password: 'SecurePass123!',
        firstName: 'Performance',
        lastName: 'Test',
        role: 'landlord',
      });

    authToken = registerResponse.body.accessToken;
    testUser = registerResponse.body.user;

    // Create test property
    const propertyResponse = await request(app.getHttpServer())
      .post('/api/properties')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Performance Test Property',
        description: 'A property for performance testing',
        type: 'apartment',
        price: 1000,
        currency: 'USD',
        bedrooms: 2,
        bathrooms: 1,
        area: 100,
        address: '123 Test Street',
        city: 'Test City',
        state: 'Test State',
        country: 'Test Country',
      });

    testProperty = propertyResponse.body;
  }

  async function runLoadTest(
    config: LoadTestConfig,
  ): Promise<PerformanceMetrics> {
    const results: number[] = [];
    const errors: Error[] = [];
    const startTime = Date.now();
    const endTime = startTime + config.duration * 1000;

    const promises: Promise<void>[] = [];

    // Create concurrent workers
    for (let i = 0; i < config.concurrency; i++) {
      promises.push(
        (async () => {
          while (Date.now() < endTime) {
            const requestStart = Date.now();
            try {
              const req = request(app.getHttpServer())[
                config.method.toLowerCase()
              ](config.endpoint);

              if (config.headers) {
                Object.entries(config.headers).forEach(([key, value]) => {
                  req.set(key, value);
                });
              }

              if (config.payload) {
                req.send(config.payload);
              }

              await req;
              const duration = Date.now() - requestStart;
              results.push(duration);
            } catch (error) {
              errors.push(error as Error);
              const duration = Date.now() - requestStart;
              results.push(duration);
            }
          }
        })(),
      );
    }

    await Promise.all(promises);

    // Calculate metrics
    const totalDuration = (Date.now() - startTime) / 1000;
    const sortedResults = results.sort((a, b) => a - b);
    const totalRequests = results.length;
    const successfulRequests = totalRequests - errors.length;

    return {
      endpoint: config.endpoint,
      method: config.method,
      avgResponseTime: results.reduce((a, b) => a + b, 0) / totalRequests,
      minResponseTime: Math.min(...results),
      maxResponseTime: Math.max(...results),
      p95ResponseTime: sortedResults[Math.floor(totalRequests * 0.95)] || 0,
      p99ResponseTime: sortedResults[Math.floor(totalRequests * 0.99)] || 0,
      successRate: (successfulRequests / totalRequests) * 100,
      requestsPerSecond: totalRequests / totalDuration,
      totalRequests,
      errors: errors.length,
    };
  }

  function validatePerformanceMetrics(
    metrics: PerformanceMetrics,
    expectedMaxP99: number,
    expectedMinRPS: number,
  ) {
    expect(metrics.p99ResponseTime).toBeLessThan(expectedMaxP99);
    expect(metrics.requestsPerSecond).toBeGreaterThan(expectedMinRPS);
    expect(metrics.successRate).toBeGreaterThan(95); // 95% success rate minimum
  }

  describe('Health Check Performance', () => {
    it('should handle high load on health endpoint', async () => {
      const config: LoadTestConfig = {
        endpoint: '/health',
        method: 'GET',
        concurrency: 50,
        duration: 10,
        expectedMaxP99: PERFORMANCE_THRESHOLDS.HEALTH_CHECK.maxP99,
        expectedMinRPS: PERFORMANCE_THRESHOLDS.HEALTH_CHECK.minRPS,
      };

      const metrics = await runLoadTest(config);

      console.log('Health Check Performance Metrics:', {
        avgResponseTime: `${metrics.avgResponseTime.toFixed(2)}ms`,
        p99ResponseTime: `${metrics.p99ResponseTime}ms`,
        requestsPerSecond: `${metrics.requestsPerSecond.toFixed(2)} RPS`,
        successRate: `${metrics.successRate.toFixed(2)}%`,
        totalRequests: metrics.totalRequests,
        errors: metrics.errors,
      });

      validatePerformanceMetrics(
        metrics,
        config.expectedMaxP99,
        config.expectedMinRPS,
      );
    }, 30000);

    it('should handle detailed health check under load', async () => {
      const config: LoadTestConfig = {
        endpoint: '/health/detailed',
        method: 'GET',
        concurrency: 20,
        duration: 5,
        expectedMaxP99: 200,
        expectedMinRPS: 100,
      };

      const metrics = await runLoadTest(config);

      console.log('Detailed Health Check Performance Metrics:', {
        avgResponseTime: `${metrics.avgResponseTime.toFixed(2)}ms`,
        p99ResponseTime: `${metrics.p99ResponseTime}ms`,
        requestsPerSecond: `${metrics.requestsPerSecond.toFixed(2)} RPS`,
        successRate: `${metrics.successRate.toFixed(2)}%`,
      });

      validatePerformanceMetrics(
        metrics,
        config.expectedMaxP99,
        config.expectedMinRPS,
      );
    }, 15000);
  });

  describe('Authentication Performance', () => {
    it('should handle concurrent login requests', async () => {
      const config: LoadTestConfig = {
        endpoint: '/api/auth/login',
        method: 'POST',
        payload: {
          email: 'perf-test@example.com',
          password: 'SecurePass123!',
        },
        concurrency: 10,
        duration: 5,
        expectedMaxP99: PERFORMANCE_THRESHOLDS.AUTH_LOGIN.maxP99,
        expectedMinRPS: PERFORMANCE_THRESHOLDS.AUTH_LOGIN.minRPS,
      };

      const metrics = await runLoadTest(config);

      console.log('Login Performance Metrics:', {
        avgResponseTime: `${metrics.avgResponseTime.toFixed(2)}ms`,
        p99ResponseTime: `${metrics.p99ResponseTime}ms`,
        requestsPerSecond: `${metrics.requestsPerSecond.toFixed(2)} RPS`,
        successRate: `${metrics.successRate.toFixed(2)}%`,
      });

      validatePerformanceMetrics(
        metrics,
        config.expectedMaxP99,
        config.expectedMinRPS,
      );
    }, 15000);
  });

  describe('Property Management Performance', () => {
    it('should handle property listing requests efficiently', async () => {
      const config: LoadTestConfig = {
        endpoint: '/api/properties',
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        concurrency: 15,
        duration: 8,
        expectedMaxP99: PERFORMANCE_THRESHOLDS.PROPERTY_LIST.maxP99,
        expectedMinRPS: PERFORMANCE_THRESHOLDS.PROPERTY_LIST.minRPS,
      };

      const metrics = await runLoadTest(config);

      console.log('Property Listing Performance Metrics:', {
        avgResponseTime: `${metrics.avgResponseTime.toFixed(2)}ms`,
        p99ResponseTime: `${metrics.p99ResponseTime}ms`,
        requestsPerSecond: `${metrics.requestsPerSecond.toFixed(2)} RPS`,
        successRate: `${metrics.successRate.toFixed(2)}%`,
      });

      validatePerformanceMetrics(
        metrics,
        config.expectedMaxP99,
        config.expectedMinRPS,
      );
    }, 20000);

    it('should handle property search under load', async () => {
      const config: LoadTestConfig = {
        endpoint:
          '/api/properties/search?city=Test City&minPrice=500&maxPrice=1500',
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        concurrency: 10,
        duration: 6,
        expectedMaxP99: PERFORMANCE_THRESHOLDS.SEARCH_PROPERTIES.maxP99,
        expectedMinRPS: PERFORMANCE_THRESHOLDS.SEARCH_PROPERTIES.minRPS,
      };

      const metrics = await runLoadTest(config);

      console.log('Property Search Performance Metrics:', {
        avgResponseTime: `${metrics.avgResponseTime.toFixed(2)}ms`,
        p99ResponseTime: `${metrics.p99ResponseTime}ms`,
        requestsPerSecond: `${metrics.requestsPerSecond.toFixed(2)} RPS`,
        successRate: `${metrics.successRate.toFixed(2)}%`,
      });

      validatePerformanceMetrics(
        metrics,
        config.expectedMaxP99,
        config.expectedMinRPS,
      );
    }, 15000);
  });

  describe('Memory and Resource Usage', () => {
    it('should maintain stable memory usage under load', async () => {
      const initialMemory = process.memoryUsage();

      // Run multiple concurrent load tests
      const configs: LoadTestConfig[] = [
        {
          endpoint: '/health',
          method: 'GET',
          concurrency: 20,
          duration: 5,
          expectedMaxP99: 100,
          expectedMinRPS: 100,
        },
        {
          endpoint: '/api/properties',
          method: 'GET',
          headers: { Authorization: `Bearer ${authToken}` },
          concurrency: 10,
          duration: 5,
          expectedMaxP99: 1000,
          expectedMinRPS: 20,
        },
      ];

      await Promise.all(configs.map((config) => runLoadTest(config)));

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreasePercent =
        (memoryIncrease / initialMemory.heapUsed) * 100;

      console.log('Memory Usage Analysis:', {
        initialHeapUsed: `${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        finalHeapUsed: `${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        memoryIncrease: `${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`,
        memoryIncreasePercent: `${memoryIncreasePercent.toFixed(2)}%`,
      });

      // Memory increase should be reasonable (less than 50% increase)
      expect(memoryIncreasePercent).toBeLessThan(50);
    }, 30000);
  });

  describe('Database Performance', () => {
    it('should handle concurrent database operations efficiently', async () => {
      const startTime = Date.now();
      const concurrentOperations = 20;

      const promises = Array.from(
        { length: concurrentOperations },
        async (_, index) => {
          // Create a property
          const createStart = Date.now();
          await request(app.getHttpServer())
            .post('/api/properties')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              title: `Concurrent Test Property ${index}`,
              description: `Property created during concurrent test ${index}`,
              type: 'apartment',
              price: 1000 + index * 100,
              currency: 'USD',
              bedrooms: 2,
              bathrooms: 1,
              area: 100,
              address: `${index} Concurrent Street`,
              city: 'Test City',
              state: 'Test State',
              country: 'Test Country',
            });
          const createDuration = Date.now() - createStart;

          // List properties
          const listStart = Date.now();
          await request(app.getHttpServer())
            .get('/api/properties')
            .set('Authorization', `Bearer ${authToken}`);
          const listDuration = Date.now() - listStart;

          return { createDuration, listDuration };
        },
      );

      const results = await Promise.all(promises);
      const totalDuration = Date.now() - startTime;

      const avgCreateTime =
        results.reduce((sum, r) => sum + r.createDuration, 0) / results.length;
      const avgListTime =
        results.reduce((sum, r) => sum + r.listDuration, 0) / results.length;

      console.log('Database Performance Metrics:', {
        concurrentOperations,
        totalDuration: `${totalDuration}ms`,
        avgCreateTime: `${avgCreateTime.toFixed(2)}ms`,
        avgListTime: `${avgListTime.toFixed(2)}ms`,
        operationsPerSecond: `${(concurrentOperations / (totalDuration / 1000)).toFixed(2)} ops/sec`,
      });

      // Database operations should complete within reasonable time
      expect(avgCreateTime).toBeLessThan(2000); // 2 seconds max for create
      expect(avgListTime).toBeLessThan(1000); // 1 second max for list
    }, 45000);
  });

  describe('API Rate Limiting Performance', () => {
    it('should handle rate limiting gracefully under load', async () => {
      const config: LoadTestConfig = {
        endpoint: '/api/properties',
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        concurrency: 50, // High concurrency to trigger rate limiting
        duration: 3,
        expectedMaxP99: 2000,
        expectedMinRPS: 10, // Lower expectation due to rate limiting
      };

      const metrics = await runLoadTest(config);

      console.log('Rate Limiting Performance Metrics:', {
        avgResponseTime: `${metrics.avgResponseTime.toFixed(2)}ms`,
        p99ResponseTime: `${metrics.p99ResponseTime}ms`,
        requestsPerSecond: `${metrics.requestsPerSecond.toFixed(2)} RPS`,
        successRate: `${metrics.successRate.toFixed(2)}%`,
        totalRequests: metrics.totalRequests,
        errors: metrics.errors,
      });

      // Should handle rate limiting without crashing
      expect(metrics.successRate).toBeGreaterThan(70); // Allow for rate limiting
      expect(metrics.p99ResponseTime).toBeLessThan(5000); // Should not timeout
    }, 15000);
  });

  describe('Stress Testing', () => {
    it('should survive extreme load conditions', async () => {
      const extremeConfig: LoadTestConfig = {
        endpoint: '/health',
        method: 'GET',
        concurrency: 100, // Very high concurrency
        duration: 5,
        expectedMaxP99: 1000, // More lenient under extreme load
        expectedMinRPS: 50, // Lower expectation under stress
      };

      const metrics = await runLoadTest(extremeConfig);

      console.log('Stress Test Performance Metrics:', {
        avgResponseTime: `${metrics.avgResponseTime.toFixed(2)}ms`,
        p99ResponseTime: `${metrics.p99ResponseTime}ms`,
        requestsPerSecond: `${metrics.requestsPerSecond.toFixed(2)} RPS`,
        successRate: `${metrics.successRate.toFixed(2)}%`,
        totalRequests: metrics.totalRequests,
        errors: metrics.errors,
      });

      // Should survive extreme load without complete failure
      expect(metrics.successRate).toBeGreaterThan(80);
      expect(metrics.p99ResponseTime).toBeLessThan(2000);
    }, 20000);
  });
});
