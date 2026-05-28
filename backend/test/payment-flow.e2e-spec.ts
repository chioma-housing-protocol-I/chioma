import './setup-env';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('End-to-End Payment Flow Integration (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('Payment Initiation', () => {
    it('should initiate payment with valid data', async () => {
      const paymentData = {
        amount: 100,
        currency: 'USD',
        recipientAddress: 'recipient@example.com',
        description: 'Rent payment',
      };

      const response = await request(app.getHttpServer())
        .post('/api/payments/initiate')
        .send(paymentData)
        .expect(201);

      expect(response.body).toHaveProperty('paymentId');
      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('PENDING');
      expect(response.body).toHaveProperty('amount', 100);
    });

    it('should validate payment amount', async () => {
      const paymentData = {
        amount: -100,
        currency: 'USD',
        recipientAddress: 'recipient@example.com',
      };

      await request(app.getHttpServer())
        .post('/api/payments/initiate')
        .send(paymentData)
        .expect(422);
    });

    it('should validate recipient address', async () => {
      const paymentData = {
        amount: 100,
        currency: 'USD',
        recipientAddress: 'invalid-address',
      };

      await request(app.getHttpServer())
        .post('/api/payments/initiate')
        .send(paymentData)
        .expect(422);
    });

    it('should validate currency code', async () => {
      const paymentData = {
        amount: 100,
        currency: 'INVALID',
        recipientAddress: 'recipient@example.com',
      };

      await request(app.getHttpServer())
        .post('/api/payments/initiate')
        .send(paymentData)
        .expect(422);
    });

    it('should check payer balance before initiating payment', async () => {
      const paymentData = {
        amount: 999999999,
        currency: 'USD',
        recipientAddress: 'recipient@example.com',
      };

      const response = await request(app.getHttpServer())
        .post('/api/payments/initiate')
        .send(paymentData)
        .expect(422);

      expect(response.body.error.code).toBe('INSUFFICIENT_FUNDS');
    });
  });

  describe('Blockchain Transaction Submission', () => {
    it('should submit transaction to blockchain', async () => {
      const paymentData = {
        amount: 50,
        currency: 'USD',
        recipientAddress: 'recipient@example.com',
      };

      const initiateResponse = await request(app.getHttpServer())
        .post('/api/payments/initiate')
        .send(paymentData)
        .expect(201);

      const paymentId = initiateResponse.body.paymentId;

      const submitResponse = await request(app.getHttpServer())
        .post(`/api/payments/${paymentId}/submit`)
        .expect(200);

      expect(submitResponse.body).toHaveProperty('transactionHash');
      expect(submitResponse.body).toHaveProperty('status');
      expect(submitResponse.body.status).toBe('SUBMITTED');
    });

    it('should handle blockchain submission failures', async () => {
      const paymentData = {
        amount: 50,
        currency: 'USD',
        recipientAddress: 'recipient@example.com',
      };

      const initiateResponse = await request(app.getHttpServer())
        .post('/api/payments/initiate')
        .send(paymentData)
        .expect(201);

      const paymentId = initiateResponse.body.paymentId;

      // Mock blockchain failure
      jest.spyOn(global, 'fetch').mockRejectedValueOnce(
        new Error('Blockchain connection failed'),
      );

      const response = await request(app.getHttpServer())
        .post(`/api/payments/${paymentId}/submit`)
        .expect(503);

      expect(response.body.error.code).toBe('BLOCKCHAIN_UNAVAILABLE');
    });

    it('should generate unique transaction hash', async () => {
      const paymentData = {
        amount: 50,
        currency: 'USD',
        recipientAddress: 'recipient@example.com',
      };

      const response1 = await request(app.getHttpServer())
        .post('/api/payments/initiate')
        .send(paymentData)
        .expect(201);

      const response2 = await request(app.getHttpServer())
        .post('/api/payments/initiate')
        .send(paymentData)
        .expect(201);

      const submitResponse1 = await request(app.getHttpServer())
        .post(`/api/payments/${response1.body.paymentId}/submit`)
        .expect(200);

      const submitResponse2 = await request(app.getHttpServer())
        .post(`/api/payments/${response2.body.paymentId}/submit`)
        .expect(200);

      expect(submitResponse1.body.transactionHash).not.toBe(
        submitResponse2.body.transactionHash,
      );
    });
  });

  describe('Payment Confirmation and Settlement', () => {
    it('should confirm payment after blockchain confirmation', async () => {
      const paymentData = {
        amount: 50,
        currency: 'USD',
        recipientAddress: 'recipient@example.com',
      };

      const initiateResponse = await request(app.getHttpServer())
        .post('/api/payments/initiate')
        .send(paymentData)
        .expect(201);

      const paymentId = initiateResponse.body.paymentId;

      const submitResponse = await request(app.getHttpServer())
        .post(`/api/payments/${paymentId}/submit`)
        .expect(200);

      const confirmResponse = await request(app.getHttpServer())
        .post(`/api/payments/${paymentId}/confirm`)
        .expect(200);

      expect(confirmResponse.body.status).toBe('CONFIRMED');
      expect(confirmResponse.body).toHaveProperty('settlementTime');
    });

    it('should verify payment settlement in database', async () => {
      const paymentData = {
        amount: 75,
        currency: 'USD',
        recipientAddress: 'recipient@example.com',
      };

      const initiateResponse = await request(app.getHttpServer())
        .post('/api/payments/initiate')
        .send(paymentData)
        .expect(201);

      const paymentId = initiateResponse.body.paymentId;

      await request(app.getHttpServer())
        .post(`/api/payments/${paymentId}/submit`)
        .expect(200);

      const confirmResponse = await request(app.getHttpServer())
        .post(`/api/payments/${paymentId}/confirm`)
        .expect(200);

      // Verify payment in database
      const getResponse = await request(app.getHttpServer())
        .get(`/api/payments/${paymentId}`)
        .expect(200);

      expect(getResponse.body.status).toBe('CONFIRMED');
      expect(getResponse.body.amount).toBe(75);
    });

    it('should generate settlement confirmation receipt', async () => {
      const paymentData = {
        amount: 50,
        currency: 'USD',
        recipientAddress: 'recipient@example.com',
      };

      const initiateResponse = await request(app.getHttpServer())
        .post('/api/payments/initiate')
        .send(paymentData)
        .expect(201);

      const paymentId = initiateResponse.body.paymentId;

      await request(app.getHttpServer())
        .post(`/api/payments/${paymentId}/submit`)
        .expect(200);

      const confirmResponse = await request(app.getHttpServer())
        .post(`/api/payments/${paymentId}/confirm`)
        .expect(200);

      expect(confirmResponse.body).toHaveProperty('receiptId');
      expect(confirmResponse.body).toHaveProperty('receiptUrl');
    });
  });

  describe('Error Handling and Rollback', () => {
    it('should rollback payment on blockchain failure', async () => {
      const paymentData = {
        amount: 50,
        currency: 'USD',
        recipientAddress: 'recipient@example.com',
      };

      const initiateResponse = await request(app.getHttpServer())
        .post('/api/payments/initiate')
        .send(paymentData)
        .expect(201);

      const paymentId = initiateResponse.body.paymentId;

      // Mock blockchain failure during submission
      jest.spyOn(global, 'fetch').mockRejectedValueOnce(
        new Error('Blockchain failure'),
      );

      await request(app.getHttpServer())
        .post(`/api/payments/${paymentId}/submit`)
        .expect(503);

      // Verify payment is still PENDING
      const getResponse = await request(app.getHttpServer())
        .get(`/api/payments/${paymentId}`)
        .expect(200);

      expect(getResponse.body.status).toBe('PENDING');
    });

    it('should handle double submission gracefully', async () => {
      const paymentData = {
        amount: 50,
        currency: 'USD',
        recipientAddress: 'recipient@example.com',
      };

      const initiateResponse = await request(app.getHttpServer())
        .post('/api/payments/initiate')
        .send(paymentData)
        .expect(201);

      const paymentId = initiateResponse.body.paymentId;

      const submitResponse1 = await request(app.getHttpServer())
        .post(`/api/payments/${paymentId}/submit`)
        .expect(200);

      // Second submission should be rejected or idempotent
      const submitResponse2 = await request(app.getHttpServer())
        .post(`/api/payments/${paymentId}/submit`)
        .expect(409);

      expect(submitResponse2.body.error.code).toBe('PAYMENT_ALREADY_SUBMITTED');
    });

    it('should handle payment timeout gracefully', async () => {
      const paymentData = {
        amount: 50,
        currency: 'USD',
        recipientAddress: 'recipient@example.com',
      };

      const initiateResponse = await request(app.getHttpServer())
        .post('/api/payments/initiate')
        .send(paymentData)
        .expect(201);

      const paymentId = initiateResponse.body.paymentId;

      // Simulate timeout
      jest.useFakeTimers();
      jest.advanceTimersByTime(10 * 60 * 1000); // 10 minutes

      const getResponse = await request(app.getHttpServer())
        .get(`/api/payments/${paymentId}`)
        .expect(200);

      expect(getResponse.body.status).toBe('EXPIRED');

      jest.useRealTimers();
    });
  });

  describe('Concurrent Payment Processing', () => {
    it('should handle concurrent payments from same user', async () => {
      const paymentData = {
        amount: 25,
        currency: 'USD',
        recipientAddress: 'recipient@example.com',
      };

      const promises = Array(3)
        .fill(null)
        .map(() =>
          request(app.getHttpServer())
            .post('/api/payments/initiate')
            .send(paymentData),
        );

      const responses = await Promise.all(promises);

      const paymentIds = responses.map((res) => res.body.paymentId);
      const uniqueIds = new Set(paymentIds);

      expect(uniqueIds.size).toBe(3); // All should have unique IDs
      expect(responses.every((res) => res.status === 201)).toBe(true);
    });

    it('should prevent double-spending in concurrent payments', async () => {
      const paymentData = {
        amount: 999999999, // Exceeds balance
        currency: 'USD',
        recipientAddress: 'recipient@example.com',
      };

      const promises = Array(2)
        .fill(null)
        .map(() =>
          request(app.getHttpServer())
            .post('/api/payments/initiate')
            .send(paymentData),
        );

      const responses = await Promise.all(promises);

      const failedCount = responses.filter((res) => res.status === 422).length;
      expect(failedCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Payment Status Tracking', () => {
    it('should track payment through all states', async () => {
      const paymentData = {
        amount: 50,
        currency: 'USD',
        recipientAddress: 'recipient@example.com',
      };

      const initiateResponse = await request(app.getHttpServer())
        .post('/api/payments/initiate')
        .send(paymentData)
        .expect(201);

      expect(initiateResponse.body.status).toBe('PENDING');

      const paymentId = initiateResponse.body.paymentId;

      const submitResponse = await request(app.getHttpServer())
        .post(`/api/payments/${paymentId}/submit`)
        .expect(200);

      expect(submitResponse.body.status).toBe('SUBMITTED');

      const confirmResponse = await request(app.getHttpServer())
        .post(`/api/payments/${paymentId}/confirm`)
        .expect(200);

      expect(confirmResponse.body.status).toBe('CONFIRMED');
    });

    it('should retrieve payment status', async () => {
      const paymentData = {
        amount: 50,
        currency: 'USD',
        recipientAddress: 'recipient@example.com',
      };

      const initiateResponse = await request(app.getHttpServer())
        .post('/api/payments/initiate')
        .send(paymentData)
        .expect(201);

      const paymentId = initiateResponse.body.paymentId;

      const getResponse = await request(app.getHttpServer())
        .get(`/api/payments/${paymentId}`)
        .expect(200);

      expect(getResponse.body).toHaveProperty('paymentId', paymentId);
      expect(getResponse.body).toHaveProperty('status', 'PENDING');
      expect(getResponse.body).toHaveProperty('amount', 50);
      expect(getResponse.body).toHaveProperty('currency', 'USD');
    });
  });
});
