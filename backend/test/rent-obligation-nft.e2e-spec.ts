import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe.skip('Rent Obligation NFT Integration (e2e)', () => {
  // Skipped: Requires database schema to be set up
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api', {
      exclude: ['health', 'health/detailed', 'security.txt', '.well-known'],
    });
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  }, 60000);

  describe('POST /agreements/nfts/mint', () => {
    it('should mint a new NFT for an agreement', async () => {
      const mintDto = {
        agreementId: 'test-agreement-001',
        landlordAddress: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      };

      const response = await request(app.getHttpServer())
        .post('/api/agreements/nfts/mint')
        .send(mintDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.agreementId).toBe(mintDto.agreementId);
      expect(response.body.currentOwner).toBe(mintDto.landlordAddress);
      expect(response.body.mintTxHash).toBeDefined();
    });

    it('should fail if NFT already exists', async () => {
      const mintDto = {
        agreementId: 'test-agreement-001',
        landlordAddress: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      };

      await request(app.getHttpServer())
        .post('/api/agreements/nfts/mint')
        .send(mintDto)
        .expect(400);
    });
  });

  describe('POST /agreements/nfts/transfer', () => {
    it('should transfer NFT ownership', async () => {
      const transferDto = {
        agreementId: 'test-agreement-001',
        fromAddress: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        toAddress: 'GYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY',
      };

      const response = await request(app.getHttpServer())
        .post('/api/agreements/nfts/transfer')
        .send(transferDto)
        .expect(200);

      expect(response.body.currentOwner).toBe(transferDto.toAddress);
      expect(response.body.transferCount).toBeGreaterThan(0);
    });
  });

  describe('GET /agreements/nfts/agreement/:agreementId', () => {
    it('should retrieve NFT by agreement ID', async () => {
      const agreementId = 'test-agreement-001';

      const response = await request(app.getHttpServer())
        .get(`/agreements/nfts/agreement/${agreementId}`)
        .expect(200);

      expect(response.body.agreementId).toBe(agreementId);
      expect(response.body).toHaveProperty('currentOwner');
      expect(response.body).toHaveProperty('mintTxHash');
    });

    it('should return null for non-existent NFT', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/agreements/nfts/agreement/non-existent-id')
        .expect(200);

      expect(response.body).toBeNull();
    });
  });

  describe('GET /agreements/nfts/owner/:ownerAddress', () => {
    it('should retrieve all NFTs owned by an address', async () => {
      const ownerAddress = 'GYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY';

      const response = await request(app.getHttpServer())
        .get(`/agreements/nfts/owner/${ownerAddress}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((nft: any) => {
        expect(nft.currentOwner).toBe(ownerAddress);
      });
    });
  });

  describe('POST /agreements/nfts/sync/:agreementId', () => {
    it('should sync NFT ownership from blockchain', async () => {
      const agreementId = 'test-agreement-001';

      const response = await request(app.getHttpServer())
        .post(`/agreements/nfts/sync/${agreementId}`)
        .expect(200);

      expect(response.body.message).toBe('Ownership synced successfully');
    });
  });
});
