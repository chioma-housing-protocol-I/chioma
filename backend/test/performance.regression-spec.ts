/**
 * Performance Regression Test Suite (#2213)
 *
 * Establishes performance baselines for key endpoints and guards against
 * latency degradation across releases.
 *
 * Acceptance Criteria:
 * 1. Baselines for 5 key endpoints
 * 2. Fail if latency exceeds 110% of baseline (>110% ceiling)
 * 3. Latencies recorded for each endpoint with diagnostic metrics
 *
 * Run with:
 *   pnpm run test:e2e -- --testPathPattern=performance.regression
 *   or
 *   pnpm run test:regression
 */
process.env.NODE_ENV = 'test';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

// ─── Interfaces & Data Structures ──────────────────────────────────────────

export interface EndpointBaseline {
  readonly id: string;
  readonly name: string;
  readonly method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  readonly path: string;
  /** Expected baseline latency in milliseconds */
  readonly baselineMs: number;
  /** Expected HTTP status codes (single code or array of valid codes) */
  readonly expectedStatus: number | number[];
  readonly description: string;
}

export interface LatencyRecord {
  readonly id: string;
  readonly name: string;
  readonly method: string;
  readonly path: string;
  readonly baselineMs: number;
  /** Ceiling allowed: exactly 110% of baselineMs */
  readonly thresholdMs: number;
  /** Measured roundtrip response time in ms */
  readonly recordedLatencyMs: number;
  /** Difference from baseline: recordedLatencyMs - baselineMs */
  readonly diffMs: number;
  /** Percentage of baseline: (recordedLatencyMs / baselineMs) * 100 */
  readonly percentageOfBaseline: number;
  readonly status: 'PASS' | 'REGRESSION';
  readonly samples: number[];
  readonly timestamp: string;
}

export interface RegressionTestReport {
  readonly totalEndpointsTested: number;
  readonly passedCount: number;
  readonly regressionCount: number;
  readonly thresholdMultiplier: number;
  readonly records: LatencyRecord[];
  readonly timestamp: string;
}

// ─── Regression Configuration & Baselines ───────────────────────────────────

/** Maximum allowable ratio over baseline before triggering a regression failure (110%) */
export const REGRESSION_THRESHOLD_RATIO = 1.1;

/**
 * Performance baselines for 5 key endpoints (+ API root).
 * Baselines reflect calibrated in-process E2E response times.
 */
export const PERFORMANCE_REGRESSION_BASELINES: Record<
  string,
  EndpointBaseline
> = {
  health: {
    id: 'health',
    name: 'Basic Health Check',
    method: 'GET',
    path: '/health',
    baselineMs: 250,
    expectedStatus: [200, 503],
    description: 'Core system availability and dependency liveness probe',
  },
  healthDetailed: {
    id: 'health-detailed',
    name: 'Detailed Health Check',
    method: 'GET',
    path: '/health/detailed',
    baselineMs: 350,
    expectedStatus: [200, 503],
    description:
      'Subsystem diagnostics including database, cache, and stellar',
  },
  securityTxt: {
    id: 'security-txt',
    name: 'Security Policy (RFC 9116)',
    method: 'GET',
    path: '/security.txt',
    baselineMs: 150,
    expectedStatus: 200,
    description: 'RFC 9116 security contact and vulnerability disclosure policy',
  },
  docsJson: {
    id: 'docs-json',
    name: 'OpenAPI Specification',
    method: 'GET',
    path: '/api/docs-json',
    baselineMs: 600,
    expectedStatus: 200,
    description: 'OpenAPI 3.0 contract and endpoint schema documentation',
  },
  properties: {
    id: 'properties',
    name: 'Property Listings Catalog',
    method: 'GET',
    path: '/api/properties',
    baselineMs: 800,
    expectedStatus: 200,
    description: 'Public property listings catalog retrieval',
  },
  apiRoot: {
    id: 'api-root',
    name: 'API Root Heartbeat',
    method: 'GET',
    path: '/api',
    baselineMs: 150,
    expectedStatus: 200,
    description: 'System root hello / heartbeat endpoint',
  },
};

// ─── Calculation & Helper Functions ────────────────────────────────────────

/**
 * Calculates the 110% upper limit (ceiling) for a given baseline latency.
 */
export function calculateMaxAllowedLatency(baselineMs: number): number {
  return Number((baselineMs * REGRESSION_THRESHOLD_RATIO).toFixed(2));
}

/**
 * Returns true if the measured latency exceeds 110% of the baseline.
 */
export function isRegression(latencyMs: number, baselineMs: number): boolean {
  return latencyMs > baselineMs * REGRESSION_THRESHOLD_RATIO;
}

/**
 * Asserts that a latency record does not exceed the 110% ceiling.
 * Throws a detailed regression error if violated.
 */
export function assertNoPerformanceRegression(record: LatencyRecord): void {
  if (record.status === 'REGRESSION') {
    throw new Error(
      `Performance regression detected for [${record.method} ${record.path}]: ` +
        `recorded latency ${record.recordedLatencyMs}ms exceeds 110% threshold of ${record.thresholdMs}ms ` +
        `(baseline: ${record.baselineMs}ms, ${record.percentageOfBaseline.toFixed(1)}% of baseline, +${record.diffMs}ms)`,
    );
  }
  expect(record.recordedLatencyMs).toBeLessThanOrEqual(record.thresholdMs);
}

// ─── Latency Recorder ──────────────────────────────────────────────────────

/**
 * Registry that records and tracks response latencies across test executions.
 */
export class PerformanceLatencyRecorder {
  private readonly recordsMap = new Map<string, LatencyRecord>();

  /**
   * Records latency for an endpoint and evaluates regression against 110% baseline ceiling.
   */
  record(
    baseline: EndpointBaseline,
    measuredLatencyMs: number,
    samples: number[] = [],
  ): LatencyRecord {
    const thresholdMs = calculateMaxAllowedLatency(baseline.baselineMs);
    const regression = isRegression(measuredLatencyMs, baseline.baselineMs);
    const percentageOfBaseline = Number(
      ((measuredLatencyMs / baseline.baselineMs) * 100).toFixed(2),
    );
    const diffMs = Number((measuredLatencyMs - baseline.baselineMs).toFixed(2));

    const record: LatencyRecord = {
      id: baseline.id,
      name: baseline.name,
      method: baseline.method,
      path: baseline.path,
      baselineMs: baseline.baselineMs,
      thresholdMs,
      recordedLatencyMs: Number(measuredLatencyMs.toFixed(2)),
      diffMs,
      percentageOfBaseline,
      status: regression ? 'REGRESSION' : 'PASS',
      samples: samples.map((s) => Number(s.toFixed(2))),
      timestamp: new Date().toISOString(),
    };

    this.recordsMap.set(baseline.id, record);
    return record;
  }

  getRecord(id: string): LatencyRecord | undefined {
    return this.recordsMap.get(id);
  }

  getAllRecords(): LatencyRecord[] {
    return Array.from(this.recordsMap.values());
  }

  clear(): void {
    this.recordsMap.clear();
  }

  generateReport(): RegressionTestReport {
    const records = this.getAllRecords();
    const regressionCount = records.filter(
      (r) => r.status === 'REGRESSION',
    ).length;

    return {
      totalEndpointsTested: records.length,
      passedCount: records.length - regressionCount,
      regressionCount,
      thresholdMultiplier: REGRESSION_THRESHOLD_RATIO,
      records,
      timestamp: new Date().toISOString(),
    };
  }

  formatSummary(): string {
    const records = this.getAllRecords();
    const header =
      '| Endpoint | Baseline (ms) | 110% Limit (ms) | Recorded (ms) | % Baseline | Status |';
    const separator =
      '|---|---|---|---|---|---|';
    const lines = records.map(
      (r) =>
        `| ${r.method} ${r.path} | ${r.baselineMs} | ${r.thresholdMs} | ${r.recordedLatencyMs} | ${r.percentageOfBaseline}% | ${r.status} |`,
    );
    return [header, separator, ...lines].join('\n');
  }
}

// ─── Test Suite ────────────────────────────────────────────────────────────

describe('Performance Regression Suite (#2213)', () => {
  const recorder = new PerformanceLatencyRecorder();

  describe('Acceptance Criteria & Calculation Verification', () => {
    beforeEach(() => {
      recorder.clear();
    });

    it('establishes performance baselines for at least 5 key endpoints', () => {
      const endpoints = Object.values(PERFORMANCE_REGRESSION_BASELINES);
      expect(endpoints.length).toBeGreaterThanOrEqual(5);

      const requiredKeys = [
        'health',
        'healthDetailed',
        'securityTxt',
        'docsJson',
        'properties',
      ];
      for (const key of requiredKeys) {
        expect(PERFORMANCE_REGRESSION_BASELINES[key]).toBeDefined();
        const ep = PERFORMANCE_REGRESSION_BASELINES[key];
        expect(ep.baselineMs).toBeGreaterThan(0);
        expect(ep.path).toMatch(/^\//);
        expect(['GET', 'POST', 'PUT', 'DELETE']).toContain(ep.method);
      }
    });

    it('correctly calculates the 110% ceiling (fail if >110% of baseline)', () => {
      const testCases = [
        { baseline: 100, expectedCeiling: 110 },
        { baseline: 250, expectedCeiling: 275 },
        { baseline: 350, expectedCeiling: 385 },
        { baseline: 500, expectedCeiling: 550 },
        { baseline: 600, expectedCeiling: 660 },
        { baseline: 800, expectedCeiling: 880 },
      ];

      for (const { baseline, expectedCeiling } of testCases) {
        const ceiling = calculateMaxAllowedLatency(baseline);
        expect(ceiling).toBeCloseTo(expectedCeiling, 2);
      }
    });

    it('passes when latency is less than or equal to 110% of baseline', () => {
      const baseline = 200;
      const ceiling = calculateMaxAllowedLatency(baseline); // 220ms

      // Exactly at baseline (100%)
      expect(isRegression(200, baseline)).toBe(false);

      // Under ceiling (105%)
      expect(isRegression(210, baseline)).toBe(false);

      // Exactly at ceiling (110%)
      expect(isRegression(ceiling, baseline)).toBe(false);

      const mockBaseline: EndpointBaseline = {
        id: 'test-pass',
        name: 'Pass Test',
        method: 'GET',
        path: '/test/pass',
        baselineMs: 200,
        expectedStatus: 200,
        description: 'Test pass',
      };

      const record = recorder.record(mockBaseline, 215, [210, 215, 220]);
      expect(record.status).toBe('PASS');
      expect(record.recordedLatencyMs).toBeLessThanOrEqual(record.thresholdMs);
      expect(() => assertNoPerformanceRegression(record)).not.toThrow();
    });

    it('fails when latency strictly exceeds 110% of baseline (>110%)', () => {
      const baseline = 200;
      const ceiling = calculateMaxAllowedLatency(baseline); // 220ms

      // Just over 110% ceiling (220.5ms)
      expect(isRegression(220.5, baseline)).toBe(true);

      // Well over 110% ceiling (250ms = 125%)
      expect(isRegression(250, baseline)).toBe(true);

      const mockBaseline: EndpointBaseline = {
        id: 'test-fail',
        name: 'Regression Test',
        method: 'GET',
        path: '/test/fail',
        baselineMs: 200,
        expectedStatus: 200,
        description: 'Test regression detection',
      };

      const regressedLatency = ceiling + 5; // 225ms
      const record = recorder.record(mockBaseline, regressedLatency, [
        220, 225, 230,
      ]);

      expect(record.status).toBe('REGRESSION');
      expect(record.percentageOfBaseline).toBeGreaterThan(110);
      expect(record.recordedLatencyMs).toBeGreaterThan(record.thresholdMs);
      expect(() => assertNoPerformanceRegression(record)).toThrow(
        /Performance regression detected/,
      );
    });

    it('records latencies with complete diagnostic metadata', () => {
      const mockBaseline = PERFORMANCE_REGRESSION_BASELINES.health;
      const samples = [95, 102, 98];
      const avg = samples.reduce((a, b) => a + b, 0) / samples.length;

      const record = recorder.record(mockBaseline, avg, samples);

      expect(record).toMatchObject({
        id: 'health',
        name: 'Basic Health Check',
        method: 'GET',
        path: '/health',
        baselineMs: mockBaseline.baselineMs,
        thresholdMs: calculateMaxAllowedLatency(mockBaseline.baselineMs),
        recordedLatencyMs: Number(avg.toFixed(2)),
        status: 'PASS',
        samples: [95, 102, 98],
      });
      expect(record.timestamp).toBeDefined();
      expect(recorder.getRecord('health')).toEqual(record);

      const report = recorder.generateReport();
      expect(report.totalEndpointsTested).toBe(1);
      expect(report.passedCount).toBe(1);
      expect(report.regressionCount).toBe(0);
      expect(report.records).toHaveLength(1);
    });
  });

  describe('Live Endpoint Latency Measurement & Regression Verification', () => {
    let app: INestApplication | undefined;
    const liveRecorder = new PerformanceLatencyRecorder();

    beforeAll(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();

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

      // Set up Swagger documentation module
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
    });

    afterAll(async () => {
      if (app) {
        await app.close();
      }
    }, 60000);

    /**
     * Measures endpoint latency across multiple iterations with warmup.
     */
    async function measureEndpointLatency(
      baseline: EndpointBaseline,
      iterations = 3,
    ): Promise<LatencyRecord> {
      const httpServer = app!.getHttpServer();

      // Warmup request to eliminate cold-start JIT overhead
      try {
        await request(httpServer).get(baseline.path);
      } catch (_ignored) {
        // Warmup errors do not fail test
      }

      const sampleDurations: number[] = [];

      for (let i = 0; i < iterations; i += 1) {
        const start = Date.now();
        const res = await request(httpServer).get(baseline.path);
        const elapsed = Date.now() - start;
        sampleDurations.push(elapsed);

        // Verify status code contract
        const validStatuses = Array.isArray(baseline.expectedStatus)
          ? baseline.expectedStatus
          : [baseline.expectedStatus];
        expect(validStatuses).toContain(res.status);
      }

      // Median duration filters out transient GC spikes
      const sorted = [...sampleDurations].sort((a, b) => a - b);
      const medianLatency = sorted[Math.floor(sorted.length / 2)];

      const record = liveRecorder.record(
        baseline,
        medianLatency,
        sampleDurations,
      );
      return record;
    }

    it('1. GET /health responds within 110% of baseline', async () => {
      const baseline = PERFORMANCE_REGRESSION_BASELINES.health;
      const record = await measureEndpointLatency(baseline);

      expect(record.recordedLatencyMs).toBeDefined();
      assertNoPerformanceRegression(record);
    }, 30000);

    it('2. GET /health/detailed responds within 110% of baseline', async () => {
      const baseline = PERFORMANCE_REGRESSION_BASELINES.healthDetailed;
      const record = await measureEndpointLatency(baseline);

      expect(record.recordedLatencyMs).toBeDefined();
      assertNoPerformanceRegression(record);
    }, 30000);

    it('3. GET /security.txt responds within 110% of baseline', async () => {
      const baseline = PERFORMANCE_REGRESSION_BASELINES.securityTxt;
      const record = await measureEndpointLatency(baseline);

      expect(record.recordedLatencyMs).toBeDefined();
      assertNoPerformanceRegression(record);
    }, 30000);

    it('4. GET /api/docs-json responds within 110% of baseline', async () => {
      const baseline = PERFORMANCE_REGRESSION_BASELINES.docsJson;
      const record = await measureEndpointLatency(baseline);

      expect(record.recordedLatencyMs).toBeDefined();
      assertNoPerformanceRegression(record);
    }, 30000);

    it('5. GET /api/properties responds within 110% of baseline', async () => {
      const baseline = PERFORMANCE_REGRESSION_BASELINES.properties;
      const record = await measureEndpointLatency(baseline);

      expect(record.recordedLatencyMs).toBeDefined();
      assertNoPerformanceRegression(record);
    }, 30000);

    it('verifies all 5 endpoints have recorded latencies in the summary report', () => {
      const report = liveRecorder.generateReport();
      expect(report.totalEndpointsTested).toBeGreaterThanOrEqual(5);
      expect(report.regressionCount).toBe(0);

      const recordedIds = report.records.map((r) => r.id);
      expect(recordedIds).toContain('health');
      expect(recordedIds).toContain('health-detailed');
      expect(recordedIds).toContain('security-txt');
      expect(recordedIds).toContain('docs-json');
      expect(recordedIds).toContain('properties');

      for (const rec of report.records) {
        expect(rec.recordedLatencyMs).toBeGreaterThan(0);
        expect(rec.thresholdMs).toBe(
          calculateMaxAllowedLatency(rec.baselineMs),
        );
        expect(rec.status).toBe('PASS');
      }
    });
  });
});
