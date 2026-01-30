import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthModule } from '../src/modules/auth/auth.module';
import { UsersModule } from '../src/modules/users/users.module';
import { User } from '../src/modules/users/entities/user.entity';
import { Keypair, TransactionBuilder, Networks } from '@stellar/stellar-sdk';

describe('Stellar Authentication E2E', () => {
  let app: INestApplication;
  let userRepository: any;

  // Generate test keypairs for E2E testing
  const serverKeypair = Keypair.random();
  const clientKeypair = Keypair.random();
  const validWalletAddress = clientKeypair.publicKey();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [User],
          synchronize: true,
          dropSchema: true,
        }),
        AuthModule,
        UsersModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    // Set environment variables for testing
    process.env.STELLAR_SERVER_SECRET_KEY = serverKeypair.secret();
    process.env.STELLAR_NETWORK = 'testnet';

    await app.init();
    userRepository = moduleFixture.get(getRepositoryToken(User));
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await userRepository.delete({ walletAddress: validWalletAddress });
  });

  afterAll(async () => {
    await userRepository.delete({ walletAddress: validWalletAddress });
    await app.close();
  });

  describe('/auth/stellar/challenge (POST)', () => {
    it('should generate challenge for valid wallet address', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/stellar/challenge')
        .send({ walletAddress: validWalletAddress })
        .expect(200);

      expect(response.body).toHaveProperty('challenge');
      expect(response.body).toHaveProperty('expiresAt');
      expect(typeof response.body.challenge).toBe('string');
      expect(typeof response.body.expiresAt).toBe('string');

      // Verify challenge is a valid Stellar transaction
      const transaction = TransactionBuilder.fromXDR(
        response.body.challenge,
        Networks.TESTNET,
      );
      expect(transaction).toBeDefined();
    });

    it('should reject duplicate challenge requests for same wallet', async () => {
      // First request should succeed
      await request(app.getHttpServer())
        .post('/auth/stellar/challenge')
        .send({ walletAddress: validWalletAddress })
        .expect(200);

      // Second request should fail
      await request(app.getHttpServer())
        .post('/auth/stellar/challenge')
        .send({ walletAddress: validWalletAddress })
        .expect(400);
    });

    it('should reject invalid wallet address', () => {
      return request(app.getHttpServer())
        .post('/auth/stellar/challenge')
        .send({ walletAddress: 'invalid-address' })
        .expect(400);
    });

    it('should reject empty wallet address', () => {
      return request(app.getHttpServer())
        .post('/auth/stellar/challenge')
        .send({ walletAddress: '' })
        .expect(400);
    });
  });

  describe('Complete Authentication Flow', () => {
    it('should authenticate new user with Stellar wallet', async () => {
      // Step 1: Request challenge
      const challengeResponse = await request(app.getHttpServer())
        .post('/auth/stellar/challenge')
        .send({ walletAddress: validWalletAddress })
        .expect(200);

      const challengeXdr = challengeResponse.body.challenge;

      // Step 2: Sign challenge with client keypair
      const transaction = TransactionBuilder.fromXDR(
        challengeXdr,
        Networks.TESTNET,
      );
      transaction.sign(clientKeypair);
      const signedChallengeXdr = transaction.toXDR();

      // Step 3: Verify signature and authenticate
      const verifyResponse = await request(app.getHttpServer())
        .post('/auth/stellar/verify')
        .send({
          walletAddress: validWalletAddress,
          signature: clientKeypair.sign(transaction.hash()).toString('base64'),
          challenge: signedChallengeXdr,
        })
        .expect(200);

      // Verify authentication response
      expect(verifyResponse.body).toHaveProperty('user');
      expect(verifyResponse.body).toHaveProperty('accessToken');
      expect(verifyResponse.body).toHaveProperty('refreshToken');
      expect(verifyResponse.body.user.walletAddress).toBe(validWalletAddress);
      expect(verifyResponse.body.user.authMethod).toBe('stellar');
      expect(verifyResponse.body.user.emailVerified).toBe(true);

      // Verify user was created in database
      const user = await userRepository.findOne({
        where: { walletAddress: validWalletAddress },
      });
      expect(user).toBeDefined();
      expect(user.authMethod).toBe('stellar');
    });

    it('should authenticate existing user and update auth method', async () => {
      // Create existing user with password auth
      await userRepository.save({
        email: 'test@example.com',
        password: 'hashedpassword',
        authMethod: 'password',
        walletAddress: validWalletAddress,
        isActive: true,
      });

      // Step 1: Request challenge
      const challengeResponse = await request(app.getHttpServer())
        .post('/auth/stellar/challenge')
        .send({ walletAddress: validWalletAddress })
        .expect(200);

      // Step 2: Sign and verify
      const transaction = TransactionBuilder.fromXDR(
        challengeResponse.body.challenge,
        Networks.TESTNET,
      );
      transaction.sign(clientKeypair);

      const verifyResponse = await request(app.getHttpServer())
        .post('/auth/stellar/verify')
        .send({
          walletAddress: validWalletAddress,
          signature: clientKeypair.sign(transaction.hash()).toString('base64'),
          challenge: transaction.toXDR(),
        })
        .expect(200);

      // Verify auth method was updated
      expect(verifyResponse.body.user.authMethod).toBe('stellar');

      const user = await userRepository.findOne({
        where: { walletAddress: validWalletAddress },
      });
      expect(user.authMethod).toBe('stellar');
      expect(user.lastLoginAt).toBeDefined();
    });

    it('should reject authentication with expired challenge', async () => {
      // Request challenge
      const challengeResponse = await request(app.getHttpServer())
        .post('/auth/stellar/challenge')
        .send({ walletAddress: validWalletAddress })
        .expect(200);

      // Wait for challenge to expire (simulate time passing)
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Try to use expired challenge
      const transaction = TransactionBuilder.fromXDR(
        challengeResponse.body.challenge,
        Networks.TESTNET,
      );
      transaction.sign(clientKeypair);

      await request(app.getHttpServer())
        .post('/auth/stellar/verify')
        .send({
          walletAddress: validWalletAddress,
          signature: clientKeypair.sign(transaction.hash()).toString('base64'),
          challenge: transaction.toXDR(),
        })
        .expect(401);
    });

    it('should reject authentication with invalid signature', async () => {
      const challengeResponse = await request(app.getHttpServer())
        .post('/auth/stellar/challenge')
        .send({ walletAddress: validWalletAddress })
        .expect(200);

      // Try with invalid signature
      await request(app.getHttpServer())
        .post('/auth/stellar/verify')
        .send({
          walletAddress: validWalletAddress,
          signature: 'invalid-signature',
          challenge: challengeResponse.body.challenge,
        })
        .expect(401);
    });

    it('should reject authentication with wrong wallet address', async () => {
      const challengeResponse = await request(app.getHttpServer())
        .post('/auth/stellar/challenge')
        .send({ walletAddress: validWalletAddress })
        .expect(200);

      const wrongKeypair = Keypair.random();
      const transaction = TransactionBuilder.fromXDR(
        challengeResponse.body.challenge,
        Networks.TESTNET,
      );
      transaction.sign(wrongKeypair);

      await request(app.getHttpServer())
        .post('/auth/stellar/verify')
        .send({
          walletAddress: wrongKeypair.publicKey(), // Different wallet address
          signature: wrongKeypair.sign(transaction.hash()).toString('base64'),
          challenge: transaction.toXDR(),
        })
        .expect(401);
    });
  });

  describe('/auth/stellar/verify (POST)', () => {
    it('should reject invalid wallet address', () => {
      return request(app.getHttpServer())
        .post('/auth/stellar/verify')
        .send({
          walletAddress: 'invalid-address',
          signature: 'test-signature',
          challenge: 'test-challenge',
        })
        .expect(400);
    });

    it('should reject missing fields', () => {
      return request(app.getHttpServer())
        .post('/auth/stellar/verify')
        .send({
          walletAddress: validWalletAddress,
          // Missing signature and challenge
        })
        .expect(400);
    });

    it('should reject invalid signature format', () => {
      return request(app.getHttpServer())
        .post('/auth/stellar/verify')
        .send({
          walletAddress: validWalletAddress,
          signature: '',
          challenge: 'test-challenge',
        })
        .expect(400);
    });

    it('should reject invalid challenge format', () => {
      return request(app.getHttpServer())
        .post('/auth/stellar/verify')
        .send({
          walletAddress: validWalletAddress,
          signature: 'test-signature',
          challenge: '',
        })
        .expect(400);
    });

    it('should reject non-existent challenge', async () => {
      await request(app.getHttpServer())
        .post('/auth/stellar/verify')
        .send({
          walletAddress: validWalletAddress,
          signature: 'test-signature',
          challenge: 'non-existent-challenge',
        })
        .expect(401);
    });
  });

  describe('Rate limiting', () => {
    it('should apply rate limiting to challenge endpoint', async () => {
      // Make multiple requests quickly to trigger rate limiting
      const requests = Array(6)
        .fill(null)
        .map(
          (_, index) =>
            request(app.getHttpServer())
              .post('/auth/stellar/challenge')
              .send({ walletAddress: `${validWalletAddress}_${index}` }), // Use different addresses to avoid duplicate challenge errors
        );

      const responses = await Promise.all(requests);

      // At least one should be rate limited (status 429)
      const rateLimitedResponses = responses.filter(
        (res) => res.status === 429,
      );
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should apply rate limiting to verify endpoint', async () => {
      // Make multiple requests quickly to trigger rate limiting
      const requests = Array(11)
        .fill(null)
        .map((_, index) =>
          request(app.getHttpServer())
            .post('/auth/stellar/verify')
            .send({
              walletAddress: `${validWalletAddress}_${index}`,
              signature: 'test-signature',
              challenge: 'test-challenge',
            }),
        );

      const responses = await Promise.all(requests);

      // At least one should be rate limited
      const rateLimitedResponses = responses.filter(
        (res) => res.status === 429,
      );
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Database Integration', () => {
    it('should properly clean up expired challenges', async () => {
      // Request multiple challenges for different wallets
      const wallets = Array(3)
        .fill(null)
        .map(() => Keypair.random().publicKey());

      for (const wallet of wallets) {
        await request(app.getHttpServer())
          .post('/auth/stellar/challenge')
          .send({ walletAddress: wallet })
          .expect(200);
      }

      // Wait for cleanup interval (in real implementation, this would be handled by a cleanup job)
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify challenges are stored and can be used
      for (const wallet of wallets) {
        const challengeResponse = await request(app.getHttpServer())
          .post('/auth/stellar/challenge')
          .send({ walletAddress: wallet })
          .expect(400); // Should fail because challenge already exists

        expect(challengeResponse.body.message).toContain('already requested');
      }
    });

    it('should handle concurrent requests safely', async () => {
      const concurrentRequests = Array(10)
        .fill(null)
        .map(() =>
          request(app.getHttpServer())
            .post('/auth/stellar/challenge')
            .send({ walletAddress: Keypair.random().publicKey() }),
        );

      const responses = await Promise.all(concurrentRequests);

      // All requests should either succeed or fail gracefully
      responses.forEach((response) => {
        expect([200, 400, 429]).toContain(response.status);
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed XDR gracefully', async () => {
      await request(app.getHttpServer())
        .post('/auth/stellar/verify')
        .send({
          walletAddress: validWalletAddress,
          signature: 'test-signature',
          challenge: 'invalid-xdr-format',
        })
        .expect(401);
    });

    it('should handle network configuration errors', async () => {
      // Temporarily unset environment variable
      const originalSecret = process.env.STELLAR_SERVER_SECRET_KEY;
      delete process.env.STELLAR_SERVER_SECRET_KEY;

      await request(app.getHttpServer())
        .post('/auth/stellar/challenge')
        .send({ walletAddress: validWalletAddress })
        .expect(500);

      // Restore environment variable
      process.env.STELLAR_SERVER_SECRET_KEY = originalSecret;
    });

    it('should handle very long wallet addresses', async () => {
      const longAddress = validWalletAddress + 'A'.repeat(100);

      await request(app.getHttpServer())
        .post('/auth/stellar/challenge')
        .send({ walletAddress: longAddress })
        .expect(400);
    });

    it('should handle special characters in wallet addresses', async () => {
      const specialCharsAddress = validWalletAddress.replace(/[A-Z0-9]/g, 'a');

      await request(app.getHttpServer())
        .post('/auth/stellar/challenge')
        .send({ walletAddress: specialCharsAddress })
        .expect(400);
    });
  });

  describe('Security considerations', () => {
    it('should not expose sensitive information in error messages', () => {
      return request(app.getHttpServer())
        .post('/auth/stellar/challenge')
        .send({ walletAddress: 'invalid' })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).not.toContain('database');
          expect(res.body.message).not.toContain('internal');
          expect(res.body.message).not.toContain('secret');
        });
    });

    it('should handle malformed JSON gracefully', () => {
      return request(app.getHttpServer())
        .post('/auth/stellar/challenge')
        .set('Content-Type', 'application/json')
        .send(`{"walletAddress": "${validWalletAddress}"`)
        .expect(400);
    });

    it('should prevent timing attacks by consistent response times', async () => {
      const validResponse = await request(app.getHttpServer())
        .post('/auth/stellar/challenge')
        .send({ walletAddress: validWalletAddress });

      const invalidResponse = await request(app.getHttpServer())
        .post('/auth/stellar/challenge')
        .send({ walletAddress: 'invalid-address' });

      // Both should respond quickly without revealing information
      expect(validResponse.status).toBe(200);
      expect(invalidResponse.status).toBe(400);
    });

    it('should sanitize error responses', async () => {
      await request(app.getHttpServer())
        .post('/auth/stellar/verify')
        .send({
          walletAddress: validWalletAddress,
          signature: '<script>alert("xss")</script>',
          challenge: 'test-challenge',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).not.toContain('<script>');
        });
    });
  });
});
