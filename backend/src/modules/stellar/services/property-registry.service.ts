import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as StellarSdk from '@stellar/stellar-sdk';
import { Contract, SorobanRpc, xdr } from '@stellar/stellar-sdk';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  PropertyRegistry,
  PropertyHistory,
} from '../entities/property-registry.entity';

export interface PropertyInfo {
  propertyId: string;
  ownerAddress: string;
  metadataHash: string;
  verified: boolean;
  registeredAt: number;
  verifiedAt: number | null;
}

@Injectable()
export class PropertyRegistryService {
  private readonly logger = new Logger(PropertyRegistryService.name);
  private readonly server: SorobanRpc.Server;
  private readonly contract: Contract | null;
  private readonly networkPassphrase: string;
  private readonly adminKeypair?: StellarSdk.Keypair;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(PropertyRegistry)
    private readonly propertyRegistryRepo: Repository<PropertyRegistry>,
    @InjectRepository(PropertyHistory)
    private readonly propertyHistoryRepo: Repository<PropertyHistory>,
    private readonly eventEmitter: EventEmitter2,
  ) {
    const rpcUrl =
      this.configService.get<string>('SOROBAN_RPC_URL') ||
      'https://soroban-testnet.stellar.org';
    const contractId =
      this.configService.get<string>('PROPERTY_REGISTRY_CONTRACT_ID') || '';
    const adminSecret =
      this.configService.get<string>('STELLAR_ADMIN_SECRET_KEY') || '';
    const network = this.configService.get<string>(
      'STELLAR_NETWORK',
      'testnet',
    );

    this.server = new SorobanRpc.Server(rpcUrl);
    this.contract = contractId ? new Contract(contractId) : null;
    this.networkPassphrase =
      network === 'mainnet'
        ? StellarSdk.Networks.PUBLIC
        : StellarSdk.Networks.TESTNET;

    if (adminSecret) {
      this.adminKeypair = StellarSdk.Keypair.fromSecret(adminSecret);
    }
  }

  /**
   * Register a new property on the blockchain and persist off-chain metadata.
   *
   * @param propertyId  - Unique identifier for the property
   * @param ownerAddress - Stellar public key of the property owner (landlord)
   * @param metadataHash - IPFS / external hash referencing full property metadata
   * @returns The transaction hash of the on-chain registration
   */
  async registerProperty(
    propertyId: string,
    ownerAddress: string,
    metadataHash: string,
  ): Promise<string> {
    if (!this.contract || !this.adminKeypair) {
      throw new BadRequestException(
        'Property registry contract not configured',
      );
    }

    try {
      const account = await this.server.getAccount(
        this.adminKeypair.publicKey(),
      );

      const operation = this.contract.call(
        'register_property',
        new StellarSdk.Address(ownerAddress).toScVal(),
        xdr.ScVal.scvString(propertyId),
        xdr.ScVal.scvString(metadataHash),
      );

      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      const prepared = await this.server.prepareTransaction(tx);
      prepared.sign(this.adminKeypair);

      const result = await this.server.sendTransaction(prepared);
      const hash = await this.pollTransactionStatus(result.hash);

      // Persist off-chain record
      await this.propertyRegistryRepo.save({
        propertyId,
        ownerAddress,
        metadataHash,
        verified: false,
        verifiedAt: null,
        verifiedBy: null,
      });

      this.logger.log(
        `Property registered: id=${propertyId} owner=${ownerAddress} tx=${hash}`,
      );

      this.eventEmitter.emit('property.registered', {
        propertyId,
        ownerAddress,
        metadataHash,
        transactionHash: hash,
      });

      return hash;
    } catch (error) {
      this.logger.error(
        `Property registration failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Transfer ownership of a property from one address to another.
   *
   * @param propertyId   - Unique identifier of the property to transfer
   * @param fromAddress  - Stellar public key of the current owner
   * @param toAddress    - Stellar public key of the new owner
   * @returns The transaction hash of the on-chain transfer
   */
  async transferProperty(
    propertyId: string,
    fromAddress: string,
    toAddress: string,
  ): Promise<string> {
    if (!this.contract || !this.adminKeypair) {
      throw new BadRequestException(
        'Property registry contract not configured',
      );
    }

    // Verify the property exists off-chain before attempting the transfer
    const existing = await this.propertyRegistryRepo.findOne({
      where: { propertyId },
    });
    if (!existing) {
      throw new NotFoundException(`Property not found: ${propertyId}`);
    }

    try {
      const account = await this.server.getAccount(
        this.adminKeypair.publicKey(),
      );

      const operation = this.contract.call(
        'transfer_property',
        xdr.ScVal.scvString(propertyId),
        new StellarSdk.Address(fromAddress).toScVal(),
        new StellarSdk.Address(toAddress).toScVal(),
      );

      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      const prepared = await this.server.prepareTransaction(tx);
      prepared.sign(this.adminKeypair);

      const result = await this.server.sendTransaction(prepared);
      const hash = await this.pollTransactionStatus(result.hash);

      // Update the off-chain owner record
      await this.propertyRegistryRepo.update(
        { propertyId },
        { ownerAddress: toAddress },
      );

      // Record the transfer in history
      await this.propertyHistoryRepo.save({
        propertyId,
        fromAddress,
        toAddress,
        transactionHash: hash,
      });

      this.logger.log(
        `Property transferred: id=${propertyId} from=${fromAddress} to=${toAddress} tx=${hash}`,
      );

      this.eventEmitter.emit('property.transferred', {
        propertyId,
        fromAddress,
        toAddress,
        transactionHash: hash,
      });

      return hash;
    } catch (error) {
      this.logger.error(
        `Property transfer failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Verify a registered property (admin-only on-chain operation).
   *
   * @param propertyId      - Unique identifier of the property to verify
   * @param verifierAddress - Stellar public key of the admin performing verification
   * @returns The transaction hash of the on-chain verification
   */
  async verifyProperty(
    propertyId: string,
    verifierAddress: string,
  ): Promise<string> {
    if (!this.contract || !this.adminKeypair) {
      throw new BadRequestException(
        'Property registry contract or admin keypair not configured',
      );
    }

    try {
      const account = await this.server.getAccount(
        this.adminKeypair.publicKey(),
      );

      const operation = this.contract.call(
        'verify_property',
        new StellarSdk.Address(verifierAddress).toScVal(),
        xdr.ScVal.scvString(propertyId),
      );

      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      const prepared = await this.server.prepareTransaction(tx);
      prepared.sign(this.adminKeypair);

      const result = await this.server.sendTransaction(prepared);
      const hash = await this.pollTransactionStatus(result.hash);

      // Update off-chain verification status
      await this.propertyRegistryRepo.update(
        { propertyId },
        {
          verified: true,
          verifiedAt: new Date(),
          verifiedBy: verifierAddress,
        },
      );

      this.logger.log(
        `Property verified: id=${propertyId} verifier=${verifierAddress} tx=${hash}`,
      );

      this.eventEmitter.emit('property.verified', {
        propertyId,
        verifierAddress,
        transactionHash: hash,
      });

      return hash;
    } catch (error) {
      this.logger.error(
        `Property verification failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Retrieve on-chain property information via contract simulation.
   *
   * @param propertyId - Unique identifier of the property to fetch
   * @returns PropertyInfo object or null if not found on-chain
   */
  async getProperty(propertyId: string): Promise<PropertyInfo | null> {
    if (!this.contract || !this.adminKeypair) {
      throw new BadRequestException(
        'Property registry contract not configured',
      );
    }

    try {
      const account = await this.server.getAccount(
        this.adminKeypair.publicKey(),
      );

      const operation = this.contract.call(
        'get_property',
        xdr.ScVal.scvString(propertyId),
      );

      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      const simulated = await this.server.simulateTransaction(tx);

      if (SorobanRpc.Api.isSimulationSuccess(simulated) && simulated.result) {
        const result = StellarSdk.scValToNative(simulated.result.retval);
        if (!result) return null;

        return {
          propertyId,
          ownerAddress: result.owner || result.landlord || '',
          metadataHash: result.metadata_hash || '',
          verified: result.verified || false,
          registeredAt: Number(result.registered_at) || 0,
          verifiedAt: result.verified_at ? Number(result.verified_at) : null,
        };
      }

      return null;
    } catch (error) {
      this.logger.error(`Get property failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get the total number of properties registered on-chain.
   *
   * @returns Total count of registered properties
   */
  async getPropertyCount(): Promise<number> {
    if (!this.contract || !this.adminKeypair) {
      throw new BadRequestException(
        'Property registry contract not configured',
      );
    }

    try {
      const account = await this.server.getAccount(
        this.adminKeypair.publicKey(),
      );

      const operation = this.contract.call('get_property_count');

      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      const simulated = await this.server.simulateTransaction(tx);

      if (SorobanRpc.Api.isSimulationSuccess(simulated) && simulated.result) {
        return Number(StellarSdk.scValToNative(simulated.result.retval)) || 0;
      }

      return 0;
    } catch (error) {
      this.logger.error(
        `Get property count failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Retrieve the transfer history of a property from the off-chain database.
   *
   * @param propertyId - Unique identifier of the property
   * @returns Array of PropertyHistory records ordered by transferredAt desc
   */
  async getPropertyHistory(propertyId: string): Promise<PropertyHistory[]> {
    return this.propertyHistoryRepo.find({
      where: { propertyId },
      order: { transferredAt: 'DESC' },
    });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async pollTransactionStatus(
    hash: string,
    maxAttempts = 15,
  ): Promise<string> {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const txResponse = await this.server.getTransaction(hash);
        if (txResponse.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
          return hash;
        }
        if (txResponse.status === SorobanRpc.Api.GetTransactionStatus.FAILED) {
          throw new Error(`Transaction failed: ${hash}`);
        }
      } catch (error) {
        if (i === maxAttempts - 1) throw error;
      }
    }
    throw new Error(`Transaction timeout: ${hash}`);
  }
}
