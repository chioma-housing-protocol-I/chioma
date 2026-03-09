import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Contract, SorobanRpc, xdr, Address } from '@stellar/stellar-sdk';
import * as StellarSdk from '@stellar/stellar-sdk';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  RentObligationNft,
  NFTTransfer,
} from '../../agreements/entities/rent-obligation-nft.entity';
import { NFTMetadata } from '../dto/rent-obligation-nft.dto';

export interface MintObligationParams {
  agreementId: string;
  landlordAddress: string;
}

export interface TransferObligationParams {
  agreementId: string;
  fromAddress: string;
  toAddress: string;
}

export interface RentObligationData {
  agreementId: string;
  owner: string;
  mintedAt: number;
}

@Injectable()
export class RentObligationNftService {
  private readonly logger = new Logger(RentObligationNftService.name);
  private readonly server: SorobanRpc.Server;
  private readonly contract?: Contract;
  private readonly networkPassphrase: string;
  private readonly adminKeypair?: StellarSdk.Keypair;
  private readonly isConfigured: boolean;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(RentObligationNft)
    private readonly nftRepository: Repository<RentObligationNft>,
    @InjectRepository(NFTTransfer)
    private readonly transferRepository: Repository<NFTTransfer>,
  ) {
    const rpcUrl =
      this.configService.get<string>('SOROBAN_RPC_URL') ||
      'https://soroban-testnet.stellar.org';
    const contractId =
      this.configService.get<string>('RENT_OBLIGATION_CONTRACT_ID') || '';
    const adminSecret = this.configService.get<string>(
      'STELLAR_ADMIN_SECRET_KEY',
    );
    const network = this.configService.get<string>(
      'STELLAR_NETWORK',
      'testnet',
    );

    this.server = new SorobanRpc.Server(rpcUrl);

    // Only create contract if contractId is provided
    if (contractId) {
      this.contract = new Contract(contractId);
      this.isConfigured = true;
    } else {
      this.logger.warn(
        'RENT_OBLIGATION_CONTRACT_ID not set - NFT features will be disabled',
      );
      this.isConfigured = false;
    }

    this.networkPassphrase =
      network === 'mainnet'
        ? StellarSdk.Networks.PUBLIC
        : StellarSdk.Networks.TESTNET;

    if (adminSecret) {
      this.adminKeypair = StellarSdk.Keypair.fromSecret(adminSecret);
    }
  }

  async mintRentObligationNFT(
    agreementId: string,
    tenantAddress: string,
    metadata: NFTMetadata,
  ): Promise<string> {
    // Note: tenantAddress in DTO likely refers to the recipient (landlord).
    // We use it as the landlord address for minting.
    const params: MintObligationParams = {
      agreementId,
      landlordAddress: tenantAddress,
    };

    const { txHash, obligationId } = await this.mintObligation(params);

    // Save to DB
    const nft = this.nftRepository.create({
      tokenId: obligationId,
      agreementId: agreementId,
      currentOwner: tenantAddress,
      originalOwner: tenantAddress,
      metadata: metadata,
      isActive: true,
      mintedAt: new Date(),
      mintTransactionHash: txHash,
    });

    await this.nftRepository.save(nft);

    return txHash;
  }

  async transferNFT(
    fromAddress: string,
    toAddress: string,
    tokenId: string,
  ): Promise<string> {
    const params: TransferObligationParams = {
      agreementId: tokenId,
      fromAddress,
      toAddress,
    };

    const { txHash } = await this.transferObligation(params);

    // Record transfer
    await this.recordTransfer(tokenId, fromAddress, toAddress, txHash);

    // Update NFT owner
    await this.nftRepository.update(
      { tokenId },
      { currentOwner: toAddress },
    );

    return txHash;
  }

  async mintObligation(
    params: MintObligationParams,
  ): Promise<{ txHash: string; obligationId: string }> {
    try {
      if (!this.isConfigured || !this.contract) {
        throw new Error('Contract not configured');
      }
      const landlordAddress = new Address(params.landlordAddress);
      const agreementIdScVal = xdr.ScVal.scvString(params.agreementId);
      const landlordScVal = landlordAddress.toScVal();

      const tx = await this.buildTransaction(
        'mint_obligation',
        [agreementIdScVal, landlordScVal],
        params.landlordAddress,
      );

      const response = await this.server.sendTransaction(tx);

      this.logger.log(
        `Minted rent obligation NFT for agreement ${params.agreementId}`,
      );

      return {
        txHash: response.hash,
        obligationId: params.agreementId,
      };
    } catch (error) {
      this.logger.error(
        `Failed to mint obligation for agreement ${params.agreementId}`,
        error,
      );
      throw error;
    }
  }

  async transferObligation(
    params: TransferObligationParams,
  ): Promise<{ txHash: string }> {
    try {
      if (!this.isConfigured || !this.contract) {
        throw new Error('Contract not configured');
      }
      const fromAddress = new Address(params.fromAddress);
      const toAddress = new Address(params.toAddress);
      const agreementIdScVal = xdr.ScVal.scvString(params.agreementId);

      const tx = await this.buildTransaction(
        'transfer_obligation',
        [fromAddress.toScVal(), toAddress.toScVal(), agreementIdScVal],
        params.fromAddress,
      );

      const response = await this.server.sendTransaction(tx);

      this.logger.log(
        `Transferred obligation ${params.agreementId} from ${params.fromAddress} to ${params.toAddress}`,
      );

      return { txHash: response.hash };
    } catch (error) {
      this.logger.error(
        `Failed to transfer obligation ${params.agreementId}`,
        error,
      );
      throw error;
    }
  }

  async burnNFT(tokenId: string, ownerAddress: string): Promise<string> {
    // The contract does not explicitly support burning.
    // We will mark it as burned in the database.
    // In a real scenario, we might transfer to a null address if supported.
    
    const nft = await this.nftRepository.findOne({ where: { tokenId } });
    if (!nft) {
      throw new Error('NFT not found');
    }

    if (nft.currentOwner !== ownerAddress) {
      throw new Error('Unauthorized: Only owner can burn NFT');
    }

    nft.isActive = false;
    nft.burnedAt = new Date();
    // No transaction hash for DB-only burn, or we could generate a dummy one/record the request
    nft.burnTransactionHash = 'db-burn-' + Date.now();

    await this.nftRepository.save(nft);

    return nft.burnTransactionHash;
  }

  async getNFTOwner(tokenId: string): Promise<string | null> {
    // Try DB first
    const nft = await this.nftRepository.findOne({ where: { tokenId } });
    if (nft) {
      return nft.currentOwner;
    }
    // Fallback to chain
    return this.getObligationOwner(tokenId);
  }

  async getNFTMetadata(tokenId: string): Promise<NFTMetadata | null> {
    const nft = await this.nftRepository.findOne({ where: { tokenId } });
    return nft ? nft.metadata : null;
  }

  async getNFTsByOwner(ownerAddress: string): Promise<RentObligationNft[]> {
    return this.nftRepository.find({
      where: { currentOwner: ownerAddress, isActive: true },
    });
  }

  async validateNFTOwnership(
    tokenId: string,
    ownerAddress: string,
  ): Promise<boolean> {
    const owner = await this.getNFTOwner(tokenId);
    return owner === ownerAddress;
  }

  private async recordTransfer(tokenId: string, from: string, to: string, txHash: string) {
    const transfer = this.transferRepository.create({
      tokenId,
      fromAddress: from,
      toAddress: to,
      transactionHash: txHash,
      transferredAt: new Date(),
    });
    await this.transferRepository.save(transfer);
  }

  async getObligationOwner(agreementId: string): Promise<string | null> {
    try {
      if (!this.isConfigured || !this.contract) {
        return null;
      }
      const agreementIdScVal = xdr.ScVal.scvString(agreementId);
      const result = this.contract.call(
        'get_obligation_owner',
        agreementIdScVal,
      );

      const simulated = await this.server.simulateTransaction(
        new StellarSdk.TransactionBuilder(
          new StellarSdk.Account(
            this.adminKeypair?.publicKey() ||
              'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
            '0',
          ),
          { fee: '100', networkPassphrase: this.networkPassphrase },
        )
          .addOperation(result)
          .setTimeout(30)
          .build(),
      );

      if (SorobanRpc.Api.isSimulationSuccess(simulated)) {
        if (
          simulated.result?.retval?.switch().name === 'scvVoid' ||
          !simulated.result?.retval
        ) {
          return null;
        }

        const address = Address.fromScVal(simulated.result.retval);
        return address.toString();
      }

      return null;
    } catch (error) {
      this.logger.error(
        `Failed to get obligation owner for ${agreementId}`,
        error,
      );
      return null;
    }
  }

  async getObligation(agreementId: string): Promise<RentObligationData | null> {
    try {
      if (!this.isConfigured || !this.contract) {
        return null;
      }
      const agreementIdScVal = xdr.ScVal.scvString(agreementId);
      const result = this.contract.call('get_obligation', agreementIdScVal);

      const simulated = await this.server.simulateTransaction(
        new StellarSdk.TransactionBuilder(
          new StellarSdk.Account(
            this.adminKeypair?.publicKey() ||
              'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
            '0',
          ),
          { fee: '100', networkPassphrase: this.networkPassphrase },
        )
          .addOperation(result)
          .setTimeout(30)
          .build(),
      );

      if (
        SorobanRpc.Api.isSimulationSuccess(simulated) &&
        simulated.result?.retval
      ) {
        const obligationMap = simulated.result.retval;
        return this.parseObligationData(obligationMap);
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to get obligation for ${agreementId}`, error);
      return null;
    }
  }

  async hasObligation(agreementId: string): Promise<boolean> {
    try {
      if (!this.isConfigured || !this.contract) {
        return false;
      }
      const agreementIdScVal = xdr.ScVal.scvString(agreementId);
      const result = this.contract.call('has_obligation', agreementIdScVal);

      const simulated = await this.server.simulateTransaction(
        new StellarSdk.TransactionBuilder(
          new StellarSdk.Account(
            this.adminKeypair?.publicKey() ||
              'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
            '0',
          ),
          { fee: '100', networkPassphrase: this.networkPassphrase },
        )
          .addOperation(result)
          .setTimeout(30)
          .build(),
      );

      if (SorobanRpc.Api.isSimulationSuccess(simulated)) {
        return simulated.result?.retval?.switch().name === 'scvBool'
          ? simulated.result.retval.b()
          : false;
      }

      return false;
    } catch (error) {
      this.logger.error(`Failed to check obligation for ${agreementId}`, error);
      return false;
    }
  }

  async getObligationCount(): Promise<number> {
    try {
      if (!this.isConfigured || !this.contract) {
        return 0;
      }
      const result = this.contract.call('get_obligation_count');

      const simulated = await this.server.simulateTransaction(
        new StellarSdk.TransactionBuilder(
          new StellarSdk.Account(
            this.adminKeypair?.publicKey() ||
              'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
            '0',
          ),
          { fee: '100', networkPassphrase: this.networkPassphrase },
        )
          .addOperation(result)
          .setTimeout(30)
          .build(),
      );

      if (SorobanRpc.Api.isSimulationSuccess(simulated)) {
        return simulated.result?.retval?.switch().name === 'scvU32'
          ? simulated.result.retval.u32()
          : 0;
      }

      return 0;
    } catch (error) {
      this.logger.error('Failed to get obligation count', error);
      return 0;
    }
  }

  private async buildTransaction(
    method: string,
    params: xdr.ScVal[],
    sourceAddress: string,
  ): Promise<StellarSdk.Transaction> {
    if (!this.contract) {
      throw new Error('Contract not configured');
    }
    const operation = this.contract.call(method, ...params);

    const account = await this.server.getAccount(sourceAddress);
    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();

    const simulated = await this.server.simulateTransaction(tx);

    if (SorobanRpc.Api.isSimulationError(simulated)) {
      throw new Error(`Simulation failed: ${simulated.error}`);
    }

    return SorobanRpc.assembleTransaction(tx, simulated).build();
  }

  private parseObligationData(scVal: xdr.ScVal): RentObligationData | null {
    try {
      const map = scVal.map();
      if (!map) return null;

      const data: Partial<RentObligationData> = {};

      map.forEach((entry) => {
        const key = entry.key();
        const val = entry.val();

        // Check if key is a string type
        if (key.switch().name !== 'scvString') {
          return;
        }

        const keyStr = key.str().toString();

        switch (keyStr) {
          case 'agreement_id':
            if (val.switch().name === 'scvString') {
              data.agreementId = val.str().toString();
            }
            break;
          case 'owner':
            data.owner = Address.fromScVal(val).toString();
            break;
          case 'minted_at':
            if (val.switch().name === 'scvU64') {
              data.mintedAt = Number(val.u64());
            }
            break;
        }
      });

      return data as RentObligationData;
    } catch (error) {
      this.logger.error('Failed to parse obligation data', error);
      return null;
    }
  }
}
