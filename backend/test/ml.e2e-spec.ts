import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('ML Integration E2E', () => {
  let app: INestApplication;
  let authToken: string;

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

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('ML Model Management', () => {
    it('should get all ML models', async () => {
      const response = await request(app.getHttpServer())
        .get('/ml/models')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      
      response.body.forEach((model: any) => {
        expect(model).toHaveProperty('id');
        expect(model).toHaveProperty('name');
        expect(model).toHaveProperty('version');
        expect(model).toHaveProperty('type');
        expect(model).toHaveProperty('status');
      });
    });

    it('should get model performance metrics', async () => {
      const response = await request(app.getHttpServer())
        .get('/ml/models/fraud_detection/performance')
        .expect(200);

      expect(response.body).toHaveProperty('totalPredictions');
      expect(response.body).toHaveProperty('averageLatency');
      expect(response.body).toHaveProperty('accuracy');
    });
  });

  describe('Fraud Detection', () => {
    it('should analyze transaction for fraud', async () => {
      const transaction = {
        id: 'test-txn-123',
        userId: 'test-user-123',
        amount: 5000,
        currency: 'USD',
        timestamp: new Date().toISOString(),
        ipAddress: '192.168.1.1',
      };

      const response = await request(app.getHttpServer())
        .post('/ml/fraud/analyze')
        .send(transaction)
        .expect(201);

      expect(response.body).toHaveProperty('transactionId');
      expect(response.body).toHaveProperty('riskScore');
      expect(response.body).toHaveProperty('riskLevel');
      expect(response.body).toHaveProperty('isBlocked');
      expect(response.body).toHaveProperty('flags');
      expect(Array.isArray(response.body.flags)).toBe(true);
    });

    it('should get fraud statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/ml/fraud/statistics')
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('blocked');
      expect(response.body).toHaveProperty('highRisk');
    });
  });

  describe('Recommendations', () => {
    it('should generate property recommendations', async () => {
      const recommendationRequest = {
        userId: 'test-user-123',
        type: 'property',
        limit: 5,
      };

      const response = await request(app.getHttpServer())
        .post('/ml/recommendations')
        .send(recommendationRequest)
        .expect(201);

      expect(response.body).toHaveProperty('userId');
      expect(response.body).toHaveProperty('type');
      expect(response.body).toHaveProperty('recommendations');
      expect(Array.isArray(response.body.recommendations)).toBe(true);
      expect(response.body.recommendations.length).toBeLessThanOrEqual(5);

      if (response.body.recommendations.length > 0) {
        const rec = response.body.recommendations[0];
        expect(rec).toHaveProperty('itemId');
        expect(rec).toHaveProperty('score');
        expect(rec).toHaveProperty('reasons');
        expect(rec).toHaveProperty('confidence');
      }
    });

    it('should generate similar listings recommendations', async () => {
      const recommendationRequest = {
        userId: 'test-user-123',
        type: 'similar_listings',
        context: {
          currentPropertyId: 'property-456',
        },
        limit: 3,
      };

      const response = await request(app.getHttpServer())
        .post('/ml/recommendations')
        .send(recommendationRequest)
        .expect(201);

      expect(response.body.type).toBe('similar_listings');
      expect(response.body.recommendations).toBeDefined();
    });

    it('should record user interaction', async () => {
      const interaction = {
        userId: 'test-user-123',
        itemId: 'property-789',
        interaction: 'view',
        timestamp: new Date().toISOString(),
      };

      await request(app.getHttpServer())
        .post('/ml/recommendations/interaction')
        .send(interaction)
        .expect(201);
    });
  });

  describe('Risk Assessment', () => {
    it('should assess user risk', async () => {
      const riskRequest = {
        entityId: 'test-user-123',
        entityType: 'user',
      };

      const response = await request(app.getHttpServer())
        .post('/ml/risk/assess')
        .send(riskRequest)
        .expect(201);

      expect(response.body).toHaveProperty('entityId');
      expect(response.body).toHaveProperty('entityType');
      expect(response.body).toHaveProperty('overallRiskScore');
      expect(response.body).toHaveProperty('riskLevel');
      expect(response.body).toHaveProperty('factors');
      expect(response.body).toHaveProperty('recommendations');
      expect(response.body.overallRiskScore).toBeGreaterThanOrEqual(0);
      expect(response.body.overallRiskScore).toBeLessThanOrEqual(100);
    });

    it('should assess property risk', async () => {
      const riskRequest = {
        entityId: 'test-property-123',
        entityType: 'property',
        context: {
          propertyValue: 500000,
        },
      };

      const response = await request(app.getHttpServer())
        .post('/ml/risk/assess')
        .send(riskRequest)
        .expect(201);

      expect(response.body.entityType).toBe('property');
      expect(response.body.factors).toBeDefined();
    });

    it('should get risk mitigation strategies', async () => {
      const response = await request(app.getHttpServer())
        .get('/ml/risk/mitigation/test-user-123')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      
      if (response.body.length > 0) {
        const strategy = response.body[0];
        expect(strategy).toHaveProperty('riskFactor');
        expect(strategy).toHaveProperty('action');
        expect(strategy).toHaveProperty('priority');
        expect(['low', 'medium', 'high']).toContain(strategy.priority);
      }
    });
  });

  describe('Integration & Performance', () => {
    it('should handle concurrent recommendation requests', async () => {
      const requests = Array.from({ length: 10 }, () =>
        request(app.getHttpServer())
          .post('/ml/recommendations')
          .send({
            userId: `test-user-${Math.random()}`,
            type: 'property',
            limit: 5,
          }),
      );

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('recommendations');
      });
    });

    it('should handle concurrent fraud analysis', async () => {
      const requests = Array.from({ length: 5 }, (_, i) =>
        request(app.getHttpServer())
          .post('/ml/fraud/analyze')
          .send({
            id: `txn-concurrent-${i}`,
            userId: 'test-user-concurrent',
            amount: 1000 + i * 100,
            currency: 'USD',
            timestamp: new Date().toISOString(),
          }),
      );

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('riskScore');
      });
    });
  });
});
