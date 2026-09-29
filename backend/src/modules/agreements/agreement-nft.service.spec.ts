import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgreementNftService } from './agreement-nft.service';
import { RentObligationNftService } from '../stellar/services/rent-obligation-nft.service';
import { RentObligationNft } from './entities/rent-obligation-nft.entity';

describe('AgreementNftService', () => {
  let service: AgreementNftService;
  let nftRepository: Repository<RentObligationNft>;
  let nftContractService: RentObligationNftService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgreementNftService,
        {
          provide: getRepositoryToken(RentObligationNft),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: RentObligationNftService,
          useValue: {
            mintObligation: jest.fn(),
            transferObligation: jest.fn(),
            getObligationOwner: jest.fn(),
            burnObligation: jest.fn(),
            adminReassignObligation: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AgreementNftService>(AgreementNftService);
    nftRepository = module.get<Repository<RentObligationNft>>(
      getRepositoryToken(RentObligationNft),
    );
    nftContractService = module.get<RentObligationNftService>(
      RentObligationNftService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('mintNftForAgreement', () => {
    it('should mint NFT successfully', async () => {
      const agreementId = 'agreement-123';
      const adminAddress = 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

      jest.spyOn(nftRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(nftContractService, 'mintObligation').mockResolvedValue({
        txHash: 'tx-hash-123',
        obligationId: agreementId,
      });
      jest.spyOn(nftRepository, 'create').mockReturnValue({
        agreementId,
        currentOwner: adminAddress,
      } as RentObligationNft);
      jest.spyOn(nftRepository, 'save').mockResolvedValue({
        id: 'nft-id',
        agreementId,
      } as RentObligationNft);

      const result = await service.mintNftForAgreement(
        agreementId,
        adminAddress,
      );

      expect(result).toBeDefined();
      expect(nftContractService.mintObligation).toHaveBeenCalledWith({
        agreementId,
        adminAddress,
      });
    });

    it('should throw error if NFT already exists', async () => {
      const agreementId = 'agreement-123';
      const adminAddress = 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

      jest.spyOn(nftRepository, 'findOne').mockResolvedValue({
        id: 'existing-nft',
        agreementId,
      } as RentObligationNft);

      await expect(
        service.mintNftForAgreement(agreementId, adminAddress),
      ).rejects.toThrow('NFT already minted');
    });
  });

  describe('transferNft', () => {
    it('should transfer NFT successfully', async () => {
      const agreementId = 'agreement-123';
      const fromAddress = 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
      const toAddress = 'GYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY';

      const existingNft = {
        id: 'nft-id',
        agreementId,
        currentOwner: fromAddress,
        transferCount: 0,
      } as RentObligationNft;

      jest.spyOn(nftRepository, 'findOne').mockResolvedValue(existingNft);
      jest.spyOn(nftContractService, 'transferObligation').mockResolvedValue({
        txHash: 'transfer-tx-hash',
      });
      jest.spyOn(nftRepository, 'save').mockResolvedValue(existingNft);

      const result = await service.transferNft(
        agreementId,
        fromAddress,
        toAddress,
      );

      expect(result.currentOwner).toBe(toAddress);
      expect(result.transferCount).toBe(1);
    });
  });

  describe('burnNftForAgreement', () => {
    it('burns the NFT and marks it burned', async () => {
      const agreementId = 'agreement-123';
      const existingNft = {
        id: 'nft-id',
        agreementId,
        tokenId: 'token-123',
        currentOwner: 'GOWNER',
        status: 'active',
        isActive: true,
      } as unknown as RentObligationNft;

      jest.spyOn(nftRepository, 'findOne').mockResolvedValue(existingNft);
      jest.spyOn(nftContractService, 'burnObligation').mockResolvedValue({
        txHash: 'burn-tx-hash',
      });
      jest
        .spyOn(nftRepository, 'save')
        .mockImplementation((n) => Promise.resolve(n as RentObligationNft));

      const result = await service.burnNftForAgreement(
        agreementId,
        'AgreementTerminated',
      );

      expect(nftContractService.burnObligation).toHaveBeenCalledWith({
        tokenId: 'token-123',
        reason: 'AgreementTerminated',
        ownerAddress: 'GOWNER',
      });
      expect(result.status).toBe('burned');
      expect(result.isActive).toBe(false);
      expect(result.burnTxHash).toBe('burn-tx-hash');
    });

    it('is a no-op when the NFT is already burned', async () => {
      const agreementId = 'agreement-123';
      const existingNft = {
        id: 'nft-id',
        agreementId,
        tokenId: 'token-123',
        currentOwner: 'GOWNER',
        status: 'burned',
        isActive: false,
      } as unknown as RentObligationNft;

      jest.spyOn(nftRepository, 'findOne').mockResolvedValue(existingNft);

      const result = await service.burnNftForAgreement(
        agreementId,
        'AgreementTerminated',
      );

      expect(nftContractService.burnObligation).not.toHaveBeenCalled();
      expect(result.status).toBe('burned');
    });

    it('throws when NFT is not found', async () => {
      jest.spyOn(nftRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.burnNftForAgreement('missing-agreement', 'AgreementTerminated'),
      ).rejects.toThrow('NFT not found for agreement missing-agreement');
    });
  });

  describe('adminReassignNft', () => {
    it('reassigns the obligation to a new owner', async () => {
      const agreementId = 'agreement-123';
      const newOwnerAddress = 'GNEWOWNER';
      const adminAddress = 'GADMIN';
      const existingNft = {
        id: 'nft-id',
        agreementId,
        currentOwner: 'GOLDOWNER',
        transferCount: 0,
      } as unknown as RentObligationNft;

      jest.spyOn(nftRepository, 'findOne').mockResolvedValue(existingNft);
      jest
        .spyOn(nftContractService, 'adminReassignObligation')
        .mockResolvedValue({ txHash: 'reassign-tx-hash' });
      jest
        .spyOn(nftRepository, 'save')
        .mockImplementation((n) => Promise.resolve(n as RentObligationNft));

      const result = await service.adminReassignNft(
        agreementId,
        newOwnerAddress,
        adminAddress,
      );

      expect(nftContractService.adminReassignObligation).toHaveBeenCalledWith({
        agreementId,
        newOwnerAddress,
        adminAddress,
      });
      expect(result.currentOwner).toBe(newOwnerAddress);
      expect(result.transferCount).toBe(1);
    });

    it('throws when NFT is not found', async () => {
      jest.spyOn(nftRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.adminReassignNft('missing-agreement', 'GNEW', 'GADMIN'),
      ).rejects.toThrow('NFT not found for agreement missing-agreement');
    });
  });
});
