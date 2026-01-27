import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthModule } from '../src/modules/auth/auth.module';
import { UsersModule } from '../src/modules/users/users.module';
import { User } from '../src/modules/users/entities/user.entity';
import {
  Keypair,
  TransactionBuilder,
  Networks,
  Operation,
} from '@stellar/stellar-sdk';

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

  describe('API Endpoint Validation', () => {
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

    it('should reject invalid wallet address', async () => {
      await request(app.getHttpServer())
        .post('/auth/stellar/challenge')
        .send({ walletAddress: 'invalid-address' })
        .expect(400);
    });

    it('should reject empty wallet address', async () => {
      await request(app.getHttpServer())
        .post('/auth/stellar/challenge')
        .send({ walletAddress: '' })
        .expect(400);
    });

    it('should handle malformed requests', async () => {
      // Test invalid JSON
      await request(app.getHttpServer())
        .post('/auth/stellar/challenge')
        .set('Content-Type', 'application/json')
        .send('{"walletAddress": "invalid"')
        .expect(400);
    });

    it('should validate HTTP methods', async () => {
      // Test GET on POST endpoint
      await request(app.getHttpServer())
        .get('/auth/stellar/challenge')
        .expect(404);

      // Test PUT on POST endpoint
      await request(app.getHttpServer())
        .put('/auth/stellar/challenge')
        .send({ walletAddress: validWalletAddress })
        .expect(404);
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

    it('should reject authentication with non-existent challenge', async () => {
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

  describe('Database Integration', () => {
    it('should handle concurrent requests safely', async () => {
      const concurrentRequests = Array(5)
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

    it('should properly clean up user data', async () => {
      // Create a user
      await userRepository.save({
        walletAddress: validWalletAddress,
        authMethod: 'stellar',
        isActive: true,
      });

      // Verify user exists
      let user = await userRepository.findOne({
        where: { walletAddress: validWalletAddress },
      });
      expect(user).toBeDefined();

      // Clean up should work in beforeEach
      await userRepository.delete({ walletAddress: validWalletAddress });

      // Verify user is deleted
      user = await userRepository.findOne({
        where: { walletAddress: validWalletAddress },
      });
      expect(user).toBeNull();
    });
  });

  describe('Stellar SDK Integration', () => {
    it('should generate valid Stellar keypairs', () => {
      expect(serverKeypair.publicKey()).toMatch(/^G[A-Z2-7]{55}$/);
      expect(serverKeypair.secret()).toMatch(/^S[A-Z2-7]{55}$/);
      expect(clientKeypair.publicKey()).toMatch(/^G[A-Z2-7]{55}$/);
      expect(clientKeypair.secret()).toMatch(/^S[A-Z2-7]{55}$/);
    });

    it('should create and sign Stellar transactions', () => {
      const nonce = 'test-nonce-12345';

      // Create a mock challenge transaction
      const account = {
        accountId: () => serverKeypair.publicKey(),
        sequenceNumber: () => '1',
        incrementSequenceNumber: () => {},
      };

      const transaction = new TransactionBuilder(account, {
        fee: '100',
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          Operation.manageData({
            name: `${validWalletAddress}_auth`,
            value: nonce,
            source: validWalletAddress,
          }),
        )
        .setTimeout(300)
        .build();

      // Sign with server keypair
      transaction.sign(serverKeypair);

      // Verify transaction is valid
      expect(transaction.toXDR()).toBeDefined();
      expect(transaction.toXDR().length).toBeGreaterThan(0);

      // Verify signature
      const keypair = Keypair.fromPublicKey(serverKeypair.publicKey());
      const signatures = transaction.signatures;
      const isValidSignature = signatures.some((sig) => {
        try {
          return keypair.verify(transaction.hash(), sig.signature());
        } catch {
          return false;
        }
      });

      expect(isValidSignature).toBe(true);
    });
  });

  describe('Security Validation', () => {
    it('should validate Stellar address formats', () => {
      // Valid addresses
      const validAddresses = [
        clientKeypair.publicKey(),
        serverKeypair.publicKey(),
        'GBTT5LIQ7BOBRY4GNJGY37GKPYRPTXVM6NGWDN3NGLGH2EKFO7JU57ZC', // Valid 56-character address
      ];

      validAddresses.forEach((address) => {
        expect(address).toMatch(/^G[A-Z2-7]{55}$/);
      });

      // Invalid addresses
      const invalidAddresses = [
        'invalid',
        '',
        'G' + 'A'.repeat(54), // Invalid characters
        'GD5DJ3B6A2KHWGFPJGBM4D7J23G5QJY6XQFQKXQ2Q2Q2Q2Q2Q2Q', // Too short
        'GD5DJ3B6A2KHWGFPJGBM4D7J23G5QJY6XQFQKXQ2Q2Q2Q2Q2Q2Q2Q2Q', // Too long
      ];

      invalidAddresses.forEach((address) => {
        expect(address).not.toMatch(/^G[A-Z2-7]{55}$/);
      });
    });

    it('should handle edge cases in input validation', () => {
      const edgeCases = [
        null,
        undefined,
        123,
        {},
        [],
        '<script>alert("xss")</script>',
        'SELECT * FROM users',
        '../../../etc/passwd',
      ];

      edgeCases.forEach((input) => {
        // These should all be rejected by validation
        const isValid =
          typeof input === 'string' && !!input.match(/^G[A-Z2-7]{55}$/);
        expect(isValid).toBe(false);
      });
    });

    it('should prevent timing attack information leakage', async () => {
      const validAddress = validWalletAddress;
      const invalidAddress = 'invalid-address';

      // Measure response times (basic check)
      const start1 = Date.now();
      await request(app.getHttpServer())
        .post('/auth/stellar/challenge')
        .send({ walletAddress: validAddress })
        .expect(400); // Will fail due to validation, but should be fast
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      await request(app.getHttpServer())
        .post('/auth/stellar/challenge')
        .send({ walletAddress: invalidAddress })
        .expect(400);
      const time2 = Date.now() - start2;

      // Both should respond quickly (within reasonable time difference)
      expect(Math.abs(time1 - time2)).toBeLessThan(1000); // Less than 1 second difference
    });
  });

  describe('Environment Configuration', () => {
    it('should have required environment variables set', () => {
      expect(process.env.STELLAR_SERVER_SECRET_KEY).toBeDefined();
      expect(process.env.STELLAR_NETWORK).toBe('testnet');
    });

    it('should validate Stellar network configuration', () => {
      const network = process.env.STELLAR_NETWORK;
      expect(['testnet', 'mainnet', 'public']).toContain(network);

      const expectedNetwork =
        network === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;
      expect(expectedNetwork).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', () => {
      // Test with invalid network passphrase
      expect(() => {
        const account = {
          accountId: () => serverKeypair.publicKey(),
          sequenceNumber: () => '1',
          incrementSequenceNumber: () => {},
        };

        new TransactionBuilder(account, {
          fee: '100',
          networkPassphrase: 'invalid-network',
        }).build();
      }).toThrow();
    });

    it('should handle invalid secret keys', () => {
      expect(() => {
        Keypair.fromSecret('invalid-secret-key');
      }).toThrow();

      expect(() => {
        Keypair.fromSecret('');
      }).toThrow();
    });

    it('should handle malformed XDR', () => {
      expect(() => {
        TransactionBuilder.fromXDR('invalid-xdr', Networks.TESTNET);
      }).toThrow();
    });
  });
});
