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
      jest
        .spyOn(global, 'fetch')
        .mockRejectedValueOnce(new Error('Blockchain connection failed'));

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

      await request(app.getHttpServer())
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

      await request(app.getHttpServer())
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
      jest
        .spyOn(global, 'fetch')
        .mockRejectedValueOnce(new Error('Blockchain failure'));

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

      await request(app.getHttpServer())
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

  // ============================================================================
  // ADDITIONAL E2E TESTS FOR PAYMENT FLOW
  // ============================================================================

  describe('Payment Refund Flow (E2E Test #1)', () => {
    it('should successfully process a full refund for a confirmed payment', async () => {
      // Step 1: Initiate payment
      const paymentData = {
        amount: 150,
        currency: 'USD',
        recipientAddress: 'recipient@example.com',
        description: 'Service fee',
      };

      const initiateResponse = await request(app.getHttpServer())
        .post('/api/payments/initiate')
        .send(paymentData)
        .expect(201);

      const paymentId = initiateResponse.body.paymentId;

      // Step 2: Submit to blockchain
      await request(app.getHttpServer())
        .post(`/api/payments/${paymentId}/submit`)
        .expect(200);

      // Step 3: Confirm payment
      await request(app.getHttpServer())
        .post(`/api/payments/${paymentId}/confirm`)
        .expect(200);

      // Step 4: Request refund
      const refundData = {
        reason: 'Customer request',
        refundAmount: 150,
      };

      const refundResponse = await request(app.getHttpServer())
        .post(`/api/payments/${paymentId}/refund`)
        .send(refundData)
        .expect(200);

      expect(refundResponse.body).toHaveProperty('refundId');
      expect(refundResponse.body).toHaveProperty('status', 'REFUND_PENDING');
      expect(refundResponse.body).toHaveProperty('refundAmount', 150);
      expect(refundResponse.body).toHaveProperty(
        'originalPaymentId',
        paymentId,
      );

      // Step 5: Confirm refund processed
      const refundId = refundResponse.body.refundId;
      const refundConfirmResponse = await request(app.getHttpServer())
        .post(`/api/payments/refunds/${refundId}/confirm`)
        .expect(200);

      expect(refundConfirmResponse.body.status).toBe('REFUNDED');

      // Step 6: Verify original payment status updated
      const paymentStatusResponse = await request(app.getHttpServer())
        .get(`/api/payments/${paymentId}`)
        .expect(200);

      expect(paymentStatusResponse.body.status).toBe('REFUNDED');
      expect(paymentStatusResponse.body).toHaveProperty('refundedAt');
    });

    it('should process partial refund correctly', async () => {
      const paymentData = {
        amount: 200,
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

      await request(app.getHttpServer())
        .post(`/api/payments/${paymentId}/confirm`)
        .expect(200);

      // Partial refund
      const refundData = {
        reason: 'Partial service cancellation',
        refundAmount: 75,
      };

      const refundResponse = await request(app.getHttpServer())
        .post(`/api/payments/${paymentId}/refund`)
        .send(refundData)
        .expect(200);

      expect(refundResponse.body.refundAmount).toBe(75);

      const refundId = refundResponse.body.refundId;
      await request(app.getHttpServer())
        .post(`/api/payments/refunds/${refundId}/confirm`)
        .expect(200);

      // Verify payment status is PARTIALLY_REFUNDED
      const paymentStatusResponse = await request(app.getHttpServer())
        .get(`/api/payments/${paymentId}`)
        .expect(200);

      expect(paymentStatusResponse.body.status).toBe('PARTIALLY_REFUNDED');
      expect(paymentStatusResponse.body.refundedAmount).toBe(75);
      expect(paymentStatusResponse.body.netAmount).toBe(125);
    });

    it('should reject refund exceeding original payment amount', async () => {
      const paymentData = {
        amount: 100,
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

      await request(app.getHttpServer())
        .post(`/api/payments/${paymentId}/confirm`)
        .expect(200);

      // Attempt refund larger than original
      const refundData = {
        reason: 'Over refund attempt',
        refundAmount: 150,
      };

      const refundResponse = await request(app.getHttpServer())
        .post(`/api/payments/${paymentId}/refund`)
        .send(refundData)
        .expect(422);

      expect(refundResponse.body.error.code).toBe(
        'REFUND_AMOUNT_EXCEEDS_PAYMENT',
      );
    });

    it('should prevent refund on non-confirmed payment', async () => {
      const paymentData = {
        amount: 100,
        currency: 'USD',
        recipientAddress: 'recipient@example.com',
      };

      const initiateResponse = await request(app.getHttpServer())
        .post('/api/payments/initiate')
        .send(paymentData)
        .expect(201);

      const paymentId = initiateResponse.body.paymentId;

      // Try to refund before confirmation
      const refundData = {
        reason: 'Early refund attempt',
        refundAmount: 100,
      };

      const refundResponse = await request(app.getHttpServer())
        .post(`/api/payments/${paymentId}/refund`)
        .send(refundData)
        .expect(422);

      expect(refundResponse.body.error.code).toBe('PAYMENT_NOT_CONFIRMED');
    });
  });

  describe('Payment with Escrow Flow (E2E Test #2)', () => {
    it('should hold payment in escrow until conditions are met', async () => {
      // Step 1: Initiate payment with escrow
      const paymentData = {
        amount: 500,
        currency: 'USD',
        recipientAddress: 'recipient@example.com',
        description: 'Rent payment with escrow',
        escrow: true,
        escrowConditions: {
          type: 'MANUAL_RELEASE',
          releaseRequiresApproval: true,
        },
      };

      const initiateResponse = await request(app.getHttpServer())
        .post('/api/payments/initiate')
        .send(paymentData)
        .expect(201);

      const paymentId = initiateResponse.body.paymentId;

      expect(initiateResponse.body).toHaveProperty('escrowId');
      expect(initiateResponse.body.status).toBe('PENDING');

      // Step 2: Submit payment
      await request(app.getHttpServer())
        .post(`/api/payments/${paymentId}/submit`)
        .expect(200);

      // Step 3: Confirm payment (should go to ESCROWED state)
      const confirmResponse = await request(app.getHttpServer())
        .post(`/api/payments/${paymentId}/confirm`)
        .expect(200);

      expect(confirmResponse.body.status).toBe('ESCROWED');
      expect(confirmResponse.body).toHaveProperty('escrowedAt');

      const escrowId = confirmResponse.body.escrowId;

      // Step 4: Verify funds are held in escrow
      const escrowResponse = await request(app.getHttpServer())
        .get(`/api/payments/escrow/${escrowId}`)
        .expect(200);

      expect(escrowResponse.body.status).toBe('HELD');
      expect(escrowResponse.body.amount).toBe(500);

      // Step 5: Release escrow funds
      const releaseResponse = await request(app.getHttpServer())
        .post(`/api/payments/escrow/${escrowId}/release`)
        .send({ approverNote: 'Conditions met' })
        .expect(200);

      expect(releaseResponse.body.status).toBe('RELEASED');
      expect(releaseResponse.body).toHaveProperty('releasedAt');

      // Step 6: Verify payment status updated
      const finalPaymentResponse = await request(app.getHttpServer())
        .get(`/api/payments/${paymentId}`)
        .expect(200);

      expect(finalPaymentResponse.body.status).toBe('CONFIRMED');
      expect(finalPaymentResponse.body.escrowReleased).toBe(true);
    });

    it('should support escrow dispute and resolution', async () => {
      const paymentData = {
        amount: 300,
        currency: 'USD',
        recipientAddress: 'recipient@example.com',
        escrow: true,
        escrowConditions: { type: 'MANUAL_RELEASE' },
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

      const escrowId = confirmResponse.body.escrowId;

      // Raise dispute
      const disputeResponse = await request(app.getHttpServer())
        .post(`/api/payments/escrow/${escrowId}/dispute`)
        .send({
          reason: 'Service not delivered',
          disputedBy: 'payer',
        })
        .expect(200);

      expect(disputeResponse.body.status).toBe('DISPUTED');
      expect(disputeResponse.body).toHaveProperty('disputeId');

      // Resolve dispute in favor of payer (refund)
      const disputeId = disputeResponse.body.disputeId;
      const resolveResponse = await request(app.getHttpServer())
        .post(`/api/payments/escrow/disputes/${disputeId}/resolve`)
        .send({
          resolution: 'REFUND_TO_PAYER',
          resolutionNote: 'Service not provided as agreed',
        })
        .expect(200);

      expect(resolveResponse.body.status).toBe('RESOLVED');
      expect(resolveResponse.body.resolution).toBe('REFUND_TO_PAYER');

      // Verify escrow returned to payer
      const escrowStatusResponse = await request(app.getHttpServer())
        .get(`/api/payments/escrow/${escrowId}`)
        .expect(200);

      expect(escrowStatusResponse.body.status).toBe('REFUNDED');
    });

    it('should auto-release escrow after timeout period', async () => {
      const paymentData = {
        amount: 200,
        currency: 'USD',
        recipientAddress: 'recipient@example.com',
        escrow: true,
        escrowConditions: {
          type: 'TIME_BASED',
          autoReleaseAfterDays: 7,
        },
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

      const escrowId = confirmResponse.body.escrowId;

      // Simulate time passing (7 days)
      jest.useFakeTimers();
      jest.advanceTimersByTime(7 * 24 * 60 * 60 * 1000);

      // Trigger escrow check job
      await request(app.getHttpServer())
        .post('/api/payments/escrow/process-releases')
        .expect(200);

      // Verify escrow auto-released
      const escrowResponse = await request(app.getHttpServer())
        .get(`/api/payments/escrow/${escrowId}`)
        .expect(200);

      expect(escrowResponse.body.status).toBe('RELEASED');
      expect(escrowResponse.body.releaseReason).toBe('AUTO_RELEASE_TIMEOUT');

      jest.useRealTimers();
    });
  });

  describe('Payment with Multiple Recipients (Split Payment) (E2E Test #3)', () => {
    it('should split payment among multiple recipients correctly', async () => {
      const splitPaymentData = {
        totalAmount: 1000,
        currency: 'USD',
        description: 'Split rent payment',
        recipients: [
          {
            address: 'landlord@example.com',
            amount: 700,
            description: 'Landlord portion',
          },
          {
            address: 'management@example.com',
            amount: 200,
            description: 'Management fee',
          },
          {
            address: 'maintenance@example.com',
            amount: 100,
            description: 'Maintenance fee',
          },
        ],
      };

      const initiateResponse = await request(app.getHttpServer())
        .post('/api/payments/split/initiate')
        .send(splitPaymentData)
        .expect(201);

      expect(initiateResponse.body).toHaveProperty('splitPaymentId');
      expect(initiateResponse.body.recipients).toHaveLength(3);
      expect(initiateResponse.body.status).toBe('PENDING');

      const splitPaymentId = initiateResponse.body.splitPaymentId;
      const recipientPayments = initiateResponse.body.recipients;

      // Verify each recipient has a payment ID
      recipientPayments.forEach((payment: any) => {
        expect(payment).toHaveProperty('paymentId');
        expect(payment).toHaveProperty('status', 'PENDING');
        expect(payment).toHaveProperty('recipientAddress');
      });

      // Submit all payments
      const submitResponse = await request(app.getHttpServer())
        .post(`/api/payments/split/${splitPaymentId}/submit`)
        .expect(200);

      expect(submitResponse.body.status).toBe('SUBMITTED');
      expect(submitResponse.body.submittedCount).toBe(3);

      // Confirm all payments
      const confirmResponse = await request(app.getHttpServer())
        .post(`/api/payments/split/${splitPaymentId}/confirm`)
        .expect(200);

      expect(confirmResponse.body.status).toBe('CONFIRMED');
      expect(confirmResponse.body.confirmedCount).toBe(3);

      // Verify split payment status
      const statusResponse = await request(app.getHttpServer())
        .get(`/api/payments/split/${splitPaymentId}`)
        .expect(200);

      expect(statusResponse.body.status).toBe('CONFIRMED');
      expect(statusResponse.body.totalAmount).toBe(1000);
      expect(statusResponse.body.recipients).toHaveLength(3);

      // Verify individual payments
      for (const recipient of statusResponse.body.recipients) {
        expect(recipient.status).toBe('CONFIRMED');
        expect(recipient).toHaveProperty('transactionHash');
      }
    });

    it('should handle partial split payment failure gracefully', async () => {
      const splitPaymentData = {
        totalAmount: 600,
        currency: 'USD',
        recipients: [
          { address: 'recipient1@example.com', amount: 300 },
          { address: 'invalid-recipient', amount: 300 },
        ],
      };

      const initiateResponse = await request(app.getHttpServer())
        .post('/api/payments/split/initiate')
        .send(splitPaymentData)
        .expect(201);

      const splitPaymentId = initiateResponse.body.splitPaymentId;

      // Submit payments - one should fail
      const submitResponse = await request(app.getHttpServer())
        .post(`/api/payments/split/${splitPaymentId}/submit`)
        .expect(207); // Multi-status

      expect(submitResponse.body.status).toBe('PARTIALLY_SUBMITTED');
      expect(submitResponse.body.successCount).toBe(1);
      expect(submitResponse.body.failureCount).toBe(1);

      // Verify split payment status reflects partial failure
      const statusResponse = await request(app.getHttpServer())
        .get(`/api/payments/split/${splitPaymentId}`)
        .expect(200);

      expect(statusResponse.body.status).toBe('PARTIALLY_SUBMITTED');
      expect(statusResponse.body.recipients[0].status).toBe('SUBMITTED');
      expect(statusResponse.body.recipients[1].status).toBe('FAILED');
      expect(statusResponse.body.recipients[1]).toHaveProperty('errorMessage');
    });

    it('should validate split payment amounts sum to total', async () => {
      const splitPaymentData = {
        totalAmount: 1000,
        currency: 'USD',
        recipients: [
          { address: 'recipient1@example.com', amount: 400 },
          { address: 'recipient2@example.com', amount: 500 },
          // Sum is 900, not 1000
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/api/payments/split/initiate')
        .send(splitPaymentData)
        .expect(422);

      expect(response.body.error.code).toBe('SPLIT_AMOUNT_MISMATCH');
      expect(response.body.error.message).toContain('sum of recipient amounts');
    });
  });

  describe('Payment with Webhook Notifications (E2E Test #4)', () => {
    it('should send webhook notifications for payment lifecycle events', async () => {
      // Register webhook endpoint
      const webhookData = {
        url: 'https://example.com/payment-webhook',
        events: [
          'payment.initiated',
          'payment.submitted',
          'payment.confirmed',
          'payment.failed',
        ],
        secret: 'webhook-secret-key',
      };

      const webhookResponse = await request(app.getHttpServer())
        .post('/api/webhooks/register')
        .send(webhookData)
        .expect(201);

      const webhookId = webhookResponse.body.webhookId;

      // Mock webhook endpoint
      const webhookCalls: any[] = [];
      const mockWebhookServer = jest
        .spyOn(global, 'fetch')
        .mockImplementation(async (url: any, options: any) => {
          if (url === 'https://example.com/payment-webhook') {
            webhookCalls.push({
              url,
              body: JSON.parse(options.body),
              headers: options.headers,
            });
            return {
              ok: true,
              status: 200,
              json: async () => ({ received: true }),
            } as any;
          }
          return { ok: true, status: 200 } as any;
        });

      // Execute payment flow
      const paymentData = {
        amount: 100,
        currency: 'USD',
        recipientAddress: 'recipient@example.com',
        webhookId,
      };

      const initiateResponse = await request(app.getHttpServer())
        .post('/api/payments/initiate')
        .send(paymentData)
        .expect(201);

      const paymentId = initiateResponse.body.paymentId;

      await request(app.getHttpServer())
        .post(`/api/payments/${paymentId}/submit`)
        .expect(200);

      await request(app.getHttpServer())
        .post(`/api/payments/${paymentId}/confirm`)
        .expect(200);

      // Wait for async webhook delivery
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Verify webhook calls
      expect(webhookCalls.length).toBeGreaterThanOrEqual(3);

      const initiatedEvent = webhookCalls.find(
        (call) => call.body.event === 'payment.initiated',
      );
      expect(initiatedEvent).toBeDefined();
      expect(initiatedEvent.body.data.paymentId).toBe(paymentId);

      const submittedEvent = webhookCalls.find(
        (call) => call.body.event === 'payment.submitted',
      );
      expect(submittedEvent).toBeDefined();

      const confirmedEvent = webhookCalls.find(
        (call) => call.body.event === 'payment.confirmed',
      );
      expect(confirmedEvent).toBeDefined();

      // Verify webhook signature
      expect(initiatedEvent.headers).toHaveProperty('X-Webhook-Signature');

      mockWebhookServer.mockRestore();
    });

    it('should retry failed webhook deliveries with exponential backoff', async () => {
      const webhookData = {
        url: 'https://example.com/failing-webhook',
        events: ['payment.initiated'],
      };

      const webhookResponse = await request(app.getHttpServer())
        .post('/api/webhooks/register')
        .send(webhookData)
        .expect(201);

      const webhookId = webhookResponse.body.webhookId;

      let attemptCount = 0;
      const mockWebhookServer = jest
        .spyOn(global, 'fetch')
        .mockImplementation(async (url: any) => {
          if (url === 'https://example.com/failing-webhook') {
            attemptCount++;
            // Fail first 2 attempts, succeed on 3rd
            if (attemptCount < 3) {
              throw new Error('Connection failed');
            }
            return { ok: true, status: 200 } as any;
          }
          return { ok: true, status: 200 } as any;
        });

      const paymentData = {
        amount: 50,
        currency: 'USD',
        recipientAddress: 'recipient@example.com',
        webhookId,
      };

      await request(app.getHttpServer())
        .post('/api/payments/initiate')
        .send(paymentData)
        .expect(201);

      // Wait for retries
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Verify webhook was retried
      expect(attemptCount).toBeGreaterThanOrEqual(3);

      mockWebhookServer.mockRestore();
    });

    it('should log webhook delivery status for monitoring', async () => {
      const webhookData = {
        url: 'https://example.com/webhook',
        events: ['payment.initiated'],
      };

      const webhookResponse = await request(app.getHttpServer())
        .post('/api/webhooks/register')
        .send(webhookData)
        .expect(201);

      const webhookId = webhookResponse.body.webhookId;

      const paymentData = {
        amount: 50,
        currency: 'USD',
        recipientAddress: 'recipient@example.com',
        webhookId,
      };

      const initiateResponse = await request(app.getHttpServer())
        .post('/api/payments/initiate')
        .send(paymentData)
        .expect(201);

      const paymentId = initiateResponse.body.paymentId;

      // Wait for webhook delivery
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Check webhook delivery logs
      const logsResponse = await request(app.getHttpServer())
        .get(`/api/webhooks/${webhookId}/deliveries`)
        .query({ paymentId })
        .expect(200);

      expect(logsResponse.body.deliveries).toBeDefined();
      expect(logsResponse.body.deliveries.length).toBeGreaterThan(0);

      const delivery = logsResponse.body.deliveries[0];
      expect(delivery).toHaveProperty('event', 'payment.initiated');
      expect(delivery).toHaveProperty('status');
      expect(delivery).toHaveProperty('responseCode');
      expect(delivery).toHaveProperty('attemptCount');
      expect(delivery).toHaveProperty('timestamp');
    });
  });

  describe('Payment Security and Fraud Detection (E2E Test #5)', () => {
    it('should detect and flag suspicious payment patterns', async () => {
      // Rapid multiple payments (potential fraud)
      const rapidPayments = [];
      for (let i = 0; i < 5; i++) {
        const paymentData = {
          amount: 999,
          currency: 'USD',
          recipientAddress: 'suspicious@example.com',
        };

        rapidPayments.push(
          request(app.getHttpServer())
            .post('/api/payments/initiate')
            .send(paymentData),
        );
      }

      const responses = await Promise.all(rapidPayments);

      // Expect fraud detection to flag or block some payments
      const flaggedCount = responses.filter(
        (res) => res.body.fraudCheck?.status === 'FLAGGED',
      ).length;

      expect(flaggedCount).toBeGreaterThan(0);

      // At least one should be blocked after threshold
      const blockedCount = responses.filter(
        (res) => res.status === 403 || res.body.status === 'BLOCKED',
      ).length;

      expect(blockedCount).toBeGreaterThan(0);
    });

    it('should enforce payment velocity limits per user', async () => {
      const userId = 'test-user-123';

      // Send payments up to velocity limit
      const payments = [];
      for (let i = 0; i < 10; i++) {
        const paymentData = {
          amount: 100,
          currency: 'USD',
          recipientAddress: `recipient${i}@example.com`,
          userId,
        };

        payments.push(
          request(app.getHttpServer())
            .post('/api/payments/initiate')
            .send(paymentData),
        );
      }

      const responses = await Promise.all(payments);

      // Some payments should be rejected due to velocity limits
      const rejectedCount = responses.filter(
        (res) => res.status === 429,
      ).length;

      expect(rejectedCount).toBeGreaterThan(0);

      const lastRejected = responses.find((res) => res.status === 429);
      expect(lastRejected?.body.error.code).toBe('PAYMENT_VELOCITY_EXCEEDED');
      expect(lastRejected?.body.error).toHaveProperty('retryAfter');
    });

    it('should validate payment against known fraud indicators', async () => {
      const suspiciousPaymentData = {
        amount: 9999,
        currency: 'USD',
        recipientAddress: 'known-fraud@blacklist.com',
        description: 'Urgent payment - wire transfer',
        ipAddress: '192.0.2.1', // Example suspicious IP
      };

      const response = await request(app.getHttpServer())
        .post('/api/payments/initiate')
        .send(suspiciousPaymentData)
        .expect(403);

      expect(response.body.error.code).toBe('FRAUD_DETECTED');
      expect(response.body.fraudIndicators).toBeDefined();
      expect(response.body.fraudIndicators).toContain('BLACKLISTED_RECIPIENT');
      expect(response.body).toHaveProperty('riskScore');
      expect(response.body.riskScore).toBeGreaterThan(0.7);
    });

    it('should require additional verification for high-value payments', async () => {
      const highValuePaymentData = {
        amount: 50000,
        currency: 'USD',
        recipientAddress: 'recipient@example.com',
        description: 'High value transaction',
      };

      const initiateResponse = await request(app.getHttpServer())
        .post('/api/payments/initiate')
        .send(highValuePaymentData)
        .expect(202); // Accepted but requires verification

      expect(initiateResponse.body.status).toBe('PENDING_VERIFICATION');
      expect(initiateResponse.body).toHaveProperty(
        'verificationRequired',
        true,
      );
      expect(initiateResponse.body).toHaveProperty('verificationMethods');

      const paymentId = initiateResponse.body.paymentId;

      // Attempt to submit without verification
      const submitResponse = await request(app.getHttpServer())
        .post(`/api/payments/${paymentId}/submit`)
        .expect(403);

      expect(submitResponse.body.error.code).toBe('VERIFICATION_REQUIRED');

      // Submit verification code
      const verificationData = {
        method: '2FA',
        code: '123456',
      };

      const verifyResponse = await request(app.getHttpServer())
        .post(`/api/payments/${paymentId}/verify`)
        .send(verificationData)
        .expect(200);

      expect(verifyResponse.body.verified).toBe(true);

      // Now submission should succeed
      await request(app.getHttpServer())
        .post(`/api/payments/${paymentId}/submit`)
        .expect(200);
    });

    it('should log all payment actions for audit trail', async () => {
      const paymentData = {
        amount: 150,
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

      await request(app.getHttpServer())
        .post(`/api/payments/${paymentId}/confirm`)
        .expect(200);

      // Retrieve audit log
      const auditResponse = await request(app.getHttpServer())
        .get(`/api/payments/${paymentId}/audit`)
        .expect(200);

      expect(auditResponse.body.auditLog).toBeDefined();
      expect(auditResponse.body.auditLog.length).toBeGreaterThanOrEqual(3);

      const actions = auditResponse.body.auditLog.map((log: any) => log.action);
      expect(actions).toContain('PAYMENT_INITIATED');
      expect(actions).toContain('PAYMENT_SUBMITTED');
      expect(actions).toContain('PAYMENT_CONFIRMED');

      // Verify each log entry has required fields
      auditResponse.body.auditLog.forEach((log: any) => {
        expect(log).toHaveProperty('action');
        expect(log).toHaveProperty('timestamp');
        expect(log).toHaveProperty('actor');
        expect(log).toHaveProperty('ipAddress');
        expect(log).toHaveProperty('metadata');
      });
    });
  });
});
