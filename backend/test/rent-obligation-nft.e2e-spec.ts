import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AgreementNftService } from '../src/modules/agreements/agreement-nft.service';
import { RentObligationNft } from '../src/modules/agreements/entities/rent-obligation-nft.entity';
import { RentObligationNftService } from '../src/modules/stellar/services/rent-obligation-nft.service';

describe('Rent Obligation NFT Integration', () => {
  let service: AgreementNftService;

  const LANDLORD = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
  const TENANT = 'GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';
  const AGREEMENT_ID = 'agreement-nft-001';

  const mockNftRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockNftContractService = {
    mintObligation: jest
      .fn()
      .mockResolvedValue({ txHash: 'mint-tx-001', obligationId: 'obl-001' }),
    transferObligation: jest
      .fn()
      .mockResolvedValue({ txHash: 'transfer-tx-001' }),
    burnObligation: jest.fn().mockResolvedValue({ txHash: 'burn-tx-001' }),
    getObligationOwner: jest.fn().mockResolvedValue(LANDLORD),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgreementNftService,
        {
          provide: getRepositoryToken(RentObligationNft),
          useValue: mockNftRepository,
        },
        { provide: RentObligationNftService, useValue: mockNftContractService },
      ],
    }).compile();

    service = module.get<AgreementNftService>(AgreementNftService);
    jest.clearAllMocks();
  });

  describe('NFT minting', () => {
    it('creates and persists an NFT record for a new agreement', async () => {
      const nftRecord: Partial<RentObligationNft> = {
        id: 'nft-001',
        agreementId: AGREEMENT_ID,
        obligationId: 'obl-001',
        currentOwner: LANDLORD,
        mintTxHash: 'mint-tx-001',
        status: 'active',
        transferCount: 0,
      };
      mockNftRepository.findOne.mockResolvedValue(null);
      mockNftRepository.create.mockReturnValue(nftRecord);
      mockNftRepository.save.mockResolvedValue(nftRecord);

      const result = await service.mintNftForAgreement(AGREEMENT_ID, LANDLORD);

      expect(result.agreementId).toBe(AGREEMENT_ID);
      expect(result.currentOwner).toBe(LANDLORD);
      expect(result.mintTxHash).toBe('mint-tx-001');
    });

    it('throws when an NFT for the agreement already exists', async () => {
      mockNftRepository.findOne.mockResolvedValue({
        id: 'nft-001',
        agreementId: AGREEMENT_ID,
      });

      await expect(
        service.mintNftForAgreement(AGREEMENT_ID, LANDLORD),
      ).rejects.toThrow(`NFT already minted for agreement ${AGREEMENT_ID}`);
    });

    it('calls the blockchain contract during mint', async () => {
      const nftRecord: Partial<RentObligationNft> = {
        id: 'nft-001',
        agreementId: AGREEMENT_ID,
        obligationId: 'obl-001',
        currentOwner: LANDLORD,
        mintTxHash: 'mint-tx-001',
        status: 'active',
        transferCount: 0,
      };
      mockNftRepository.findOne.mockResolvedValue(null);
      mockNftRepository.create.mockReturnValue(nftRecord);
      mockNftRepository.save.mockResolvedValue(nftRecord);

      await service.mintNftForAgreement(AGREEMENT_ID, LANDLORD);

      expect(mockNftContractService.mintObligation).toHaveBeenCalledWith({
        agreementId: AGREEMENT_ID,
        adminAddress: LANDLORD,
      });
    });
  });

  describe('NFT metadata and retrieval', () => {
    it('retrieves NFT by agreement ID', async () => {
      const nftRecord: Partial<RentObligationNft> = {
        id: 'nft-001',
        agreementId: AGREEMENT_ID,
        currentOwner: LANDLORD,
        mintTxHash: 'mint-tx-001',
      };
      mockNftRepository.findOne.mockResolvedValue(nftRecord);

      const result = await service.getNftByAgreement(AGREEMENT_ID);

      expect(result).not.toBeNull();
      expect(result?.agreementId).toBe(AGREEMENT_ID);
    });

    it('returns null for a non-existent agreement ID', async () => {
      mockNftRepository.findOne.mockResolvedValue(null);

      const result = await service.getNftByAgreement('non-existent');

      expect(result).toBeNull();
    });

    it('retrieves all NFTs held by a given owner address', async () => {
      mockNftRepository.find.mockResolvedValue([
        { id: 'nft-001', agreementId: AGREEMENT_ID, currentOwner: TENANT },
        { id: 'nft-002', agreementId: 'agreement-002', currentOwner: TENANT },
      ]);

      const results = await service.getNftsByOwner(TENANT);

      expect(results).toHaveLength(2);
      results.forEach((nft) => expect(nft.currentOwner).toBe(TENANT));
    });
  });

  describe('Transfer and ownership tracking', () => {
    it('updates owner and increments transfer count on successful transfer', async () => {
      const nftRecord: RentObligationNft = {
        id: 'nft-001',
        agreementId: AGREEMENT_ID,
        currentOwner: LANDLORD,
        transferCount: 0,
        mintTxHash: 'mint-tx-001',
        status: 'active',
      } as RentObligationNft;
      mockNftRepository.findOne.mockResolvedValue(nftRecord);
      mockNftRepository.save.mockImplementation(async (entity) => entity);

      const result = await service.transferNft(AGREEMENT_ID, LANDLORD, TENANT);

      expect(result.currentOwner).toBe(TENANT);
      expect(result.transferCount).toBe(1);
      expect(result.lastTransferTxHash).toBe('transfer-tx-001');
    });

    it('throws when transferring from a non-owner address', async () => {
      mockNftRepository.findOne.mockResolvedValue({
        id: 'nft-001',
        agreementId: AGREEMENT_ID,
        currentOwner: LANDLORD,
        transferCount: 0,
      });

      await expect(
        service.transferNft(AGREEMENT_ID, TENANT, LANDLORD),
      ).rejects.toThrow('Unauthorized: Not the current NFT owner');
    });

    it('throws when NFT is not found on transfer', async () => {
      mockNftRepository.findOne.mockResolvedValue(null);

      await expect(
        service.transferNft(AGREEMENT_ID, LANDLORD, TENANT),
      ).rejects.toThrow(`NFT not found for agreement ${AGREEMENT_ID}`);
    });

    it('verifies ownership correctly for current owner', async () => {
      mockNftRepository.findOne.mockResolvedValue({
        id: 'nft-001',
        agreementId: AGREEMENT_ID,
        currentOwner: LANDLORD,
      });

      const isOwner = await service.verifyOwnership(AGREEMENT_ID, LANDLORD);
      const isNotOwner = await service.verifyOwnership(AGREEMENT_ID, TENANT);

      expect(isOwner).toBe(true);
      expect(isNotOwner).toBe(false);
    });
  });

  describe('Blockchain sync', () => {
    it('syncs on-chain owner to the database when there is a mismatch', async () => {
      const nftRecord: RentObligationNft = {
        id: 'nft-001',
        agreementId: AGREEMENT_ID,
        currentOwner: TENANT,
      } as RentObligationNft;
      mockNftRepository.findOne.mockResolvedValue(nftRecord);
      mockNftRepository.save.mockImplementation(async (entity) => entity);
      mockNftContractService.getObligationOwner.mockResolvedValue(LANDLORD);

      await service.syncNftOwnership(AGREEMENT_ID);

      expect(mockNftRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ currentOwner: LANDLORD }),
      );
    });

    it('skips save when on-chain owner matches database record', async () => {
      const nftRecord: RentObligationNft = {
        id: 'nft-001',
        agreementId: AGREEMENT_ID,
        currentOwner: LANDLORD,
      } as RentObligationNft;
      mockNftRepository.findOne.mockResolvedValue(nftRecord);
      mockNftContractService.getObligationOwner.mockResolvedValue(LANDLORD);

      await service.syncNftOwnership(AGREEMENT_ID);

      expect(mockNftRepository.save).not.toHaveBeenCalled();
    });

    it('does nothing when NFT does not exist in the database', async () => {
      mockNftRepository.findOne.mockResolvedValue(null);

      await service.syncNftOwnership('non-existent-agreement');

      expect(mockNftContractService.getObligationOwner).not.toHaveBeenCalled();
      expect(mockNftRepository.save).not.toHaveBeenCalled();
    });
  });
});
