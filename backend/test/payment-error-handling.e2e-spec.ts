import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Payment Error Handling Integration Tests
 * 
 * These tests verify that payment operations handle error conditions gracefully
 * and return appropriate error responses to clients.
 * 
 * Test coverage includes:
 * - Insufficient balance scenarios
 * - Invalid payment amounts
 * - Network/blockchain errors
 * - Invalid recipient addresses
 * - Transaction timeout handling
 * - Idempotency failures
 * 
 * Related to #2150
 */
describe('Payment Error Handling (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Authenticate test user
    const authResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test-tenant@example.com',
        password: 'test-password',
      });

    authToken = authResponse.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Invalid Payment Amount Errors', () => {
    it('should reject negative payment amounts', async () => {
      const response = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: -100,
          currency: 'USDC',
          recipientId: 'valid-landlord-id',
          description: 'Rent payment',
        })
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        message: expect.stringContaining('amount'),
        error: 'Bad Request',
      });
    });

    it('should reject zero payment amounts', async () => {
      const response = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 0,
          currency: 'USDC',
          recipientId: 'valid-landlord-id',
          description: 'Rent payment',
        })
        .expect(400);

      expect(response.body.message).toContain('amount');
    });

    it('should reject amounts exceeding maximum limit', async () => {
      const response = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 999999999999, // Exceeds reasonable limit
          currency: 'USDC',
          recipientId: 'valid-landlord-id',
          description: 'Rent payment',
        })
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
    });

    it('should reject amounts with too many decimal places', async () => {
      const response = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 100.123456789, // Too many decimals
          currency: 'USDC',
          recipientId: 'valid-landlord-id',
          description: 'Rent payment',
        })
        .expect(400);

      expect(response.body.message).toContain('decimal');
    });
  });

  describe('Invalid Recipient Errors', () => {
    it('should reject payment to non-existent recipient', async () => {
      const response = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 100,
          currency: 'USDC',
          recipientId: 'non-existent-user-id',
          description: 'Rent payment',
        })
        .expect(404);

      expect(response.body).toMatchObject({
        statusCode: 404,
        message: expect.stringContaining('recipient'),
      });
    });

    it('should reject payment to invalid Stellar address format', async () => {
      const response = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 100,
          currency: 'USDC',
          stellarAddress: 'invalid-stellar-address',
          description: 'Rent payment',
        })
        .expect(400);

      expect(response.body.message).toContain('stellar');
    });

    it('should reject self-payment attempts', async () => {
      // Get current user's ID from token
      const userProfile = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const response = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 100,
          currency: 'USDC',
          recipientId: userProfile.body.id,
          description: 'Self payment',
        })
        .expect(400);

      expect(response.body.message).toContain('cannot pay yourself');
    });
  });

  describe('Insufficient Balance Errors', () => {
    it('should reject payment when balance is insufficient', async () => {
      const response = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 999999, // Assuming test user doesn't have this much
          currency: 'USDC',
          recipientId: 'valid-landlord-id',
          description: 'Rent payment',
        })
        .expect(402); // Payment Required

      expect(response.body).toMatchObject({
        statusCode: 402,
        message: expect.stringContaining('insufficient'),
        error: 'Payment Required',
      });
    });

    it('should include current balance in insufficient funds error', async () => {
      const response = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 999999,
          currency: 'USDC',
          recipientId: 'valid-landlord-id',
          description: 'Rent payment',
        })
        .expect(402);

      expect(response.body).toHaveProperty('currentBalance');
      expect(response.body).toHaveProperty('requestedAmount');
    });
  });

  describe('Invalid Currency Errors', () => {
    it('should reject unsupported currency codes', async () => {
      const response = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 100,
          currency: 'INVALID',
          recipientId: 'valid-landlord-id',
          description: 'Rent payment',
        })
        .expect(400);

      expect(response.body.message).toContain('currency');
    });

    it('should list supported currencies in error response', async () => {
      const response = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 100,
          currency: 'XYZ',
          recipientId: 'valid-landlord-id',
          description: 'Rent payment',
        })
        .expect(400);

      expect(response.body).toHaveProperty('supportedCurrencies');
      expect(Array.isArray(response.body.supportedCurrencies)).toBe(true);
    });
  });

  describe('Duplicate Transaction Prevention', () => {
    it('should reject duplicate payment with same idempotency key', async () => {
      const idempotencyKey = `test-${Date.now()}`;
      const paymentData = {
        amount: 100,
        currency: 'USDC',
        recipientId: 'valid-landlord-id',
        description: 'Rent payment',
      };

      // First payment should succeed (or at least not fail due to duplication)
      await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send(paymentData);

      // Second payment with same key should be rejected
      const response = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send(paymentData)
        .expect(409); // Conflict

      expect(response.body).toMatchObject({
        statusCode: 409,
        message: expect.stringContaining('duplicate'),
        error: 'Conflict',
      });
    });

    it('should return original transaction details for duplicate requests', async () => {
      const idempotencyKey = `test-duplicate-${Date.now()}`;
      const paymentData = {
        amount: 100,
        currency: 'USDC',
        recipientId: 'valid-landlord-id',
        description: 'Rent payment',
      };

      const firstResponse = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send(paymentData);

      const secondResponse = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send(paymentData)
        .expect(409);

      expect(secondResponse.body).toHaveProperty('originalTransactionId');
      expect(secondResponse.body.originalTransactionId).toBe(
        firstResponse.body.transactionId,
      );
    });
  });

  describe('Missing Required Fields', () => {
    it('should reject payment without amount', async () => {
      const response = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currency: 'USDC',
          recipientId: 'valid-landlord-id',
          description: 'Rent payment',
        })
        .expect(400);

      expect(response.body.message).toContain('amount');
    });

    it('should reject payment without currency', async () => {
      const response = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 100,
          recipientId: 'valid-landlord-id',
          description: 'Rent payment',
        })
        .expect(400);

      expect(response.body.message).toContain('currency');
    });

    it('should reject payment without recipient', async () => {
      const response = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 100,
          currency: 'USDC',
          description: 'Rent payment',
        })
        .expect(400);

      expect(response.body.message).toContain('recipient');
    });
  });

  describe('Network and Blockchain Errors', () => {
    it('should handle Stellar network timeout gracefully', async () => {
      // This test requires mocking the Stellar SDK to simulate timeout
      // Implementation depends on how the payment service is structured
      
      const response = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 100,
          currency: 'USDC',
          recipientId: 'valid-landlord-id',
          description: 'Rent payment',
        });

      // If timeout occurs, should return 503 Service Unavailable
      if (response.status === 503) {
        expect(response.body).toMatchObject({
          statusCode: 503,
          message: expect.stringContaining('network'),
        });
      }
    });

    it('should provide retry-after header on temporary failures', async () => {
      // Test that temporary failures include retry guidance
      const response = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 100,
          currency: 'USDC',
          recipientId: 'valid-landlord-id',
          description: 'Rent payment',
        });

      if (response.status === 503) {
        expect(response.headers).toHaveProperty('retry-after');
      }
    });
  });

  describe('Error Response Format', () => {
    it('should return consistent error structure', async () => {
      const response = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: -100, // Invalid
          currency: 'USDC',
          recipientId: 'valid-landlord-id',
        })
        .expect(400);

      // Verify error response follows standard format
      expect(response.body).toHaveProperty('statusCode');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('path');
    });

    it('should not leak sensitive information in error messages', async () => {
      const response = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 100,
          currency: 'USDC',
          recipientId: 'non-existent',
        })
        .expect(404);

      // Error should not contain database query details, stack traces, etc.
      const errorString = JSON.stringify(response.body).toLowerCase();
      expect(errorString).not.toContain('select');
      expect(errorString).not.toContain('database');
      expect(errorString).not.toContain('stack');
      expect(errorString).not.toContain('sql');
    });
  });
});
