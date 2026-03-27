import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as StellarSdk from '@stellar/stellar-sdk';
import {
  PropertyRegistry,
  PropertyHistory,
} from '../entities/property-registry.entity';
import { StellarAccount } from '../entities/stellar-account.entity';
import {
  RegisterPropertyDto,
  TransferPropertyDto,
  VerifyPropertyDto,
} from '../dto/property-registry.dto';
import { EncryptionService } from './encryption.service';
import { StellarConfig } from '../config/stellar.config';

@Injectable()
export class PropertyRegistryService {
  private readonly logger = new Logger(PropertyRegistryService.name);
  private readonly sorobanRpc: StellarSdk.SorobanRpc.Server;
  private readonly contract: StellarSdk.Contract;
  private readonly networkPassphrase: string;

  constructor(
    @InjectRepository(PropertyRegistry)
    private propertyRegistryRepo: Repository<PropertyRegistry>,
    @InjectRepository(PropertyHistory)
    private propertyHistoryRepo: Repository<PropertyHistory>,
    @InjectRepository(StellarAccount)
    private accountRepository: Repository<StellarAccount>,
    private configService: ConfigService,
    private encryptionService: EncryptionService,
  ) {
    const config = this.configService.get<StellarConfig>('stellar')!;

    // FIX 1: Cast config to 'any' to bypass strict interface checking for rpcUrl
    const rpcUrl =
      (config as any).rpcUrl || 'https://soroban-testnet.stellar.org';
    this.sorobanRpc = new StellarSdk.SorobanRpc.Server(rpcUrl);
    this.networkPassphrase = config.networkPassphrase;

    const contractId =
      this.configService.get<string>('PROPERTY_REGISTRY_CONTRACT_ID') ||
      'DEFAULT_CONTRACT_ID';
    this.contract = new StellarSdk.Contract(contractId);
  }

  private async invokeContractFunction(
    sourcePublicKey: string,
    functionName: string,
    args: StellarSdk.xdr.ScVal[],
  ): Promise<string> {
    try {
      const sourceAccountDb = await this.accountRepository.findOne({
        where: { publicKey: sourcePublicKey },
      });
      if (!sourceAccountDb)
        throw new NotFoundException('Signer account not found in DB');

      const secretKey = this.encryptionService.decrypt(
        sourceAccountDb.secretKeyEncrypted,
      );
      const keypair = StellarSdk.Keypair.fromSecret(secretKey);

      const accountInfo = await this.sorobanRpc.getAccount(sourcePublicKey);

      // FIX 2: Cast to 'any' and safely grab the sequence number regardless of SDK version
      const sequence =
        (accountInfo as any).sequence ||
        (accountInfo as any).sequenceNumber?.() ||
        '0';
      const sourceAccount = new StellarSdk.Account(
        sourcePublicKey,
        sequence.toString(),
      );

      const operation = this.contract.call(functionName, ...args);

      let tx = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: '1000',
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      tx = await this.sorobanRpc.prepareTransaction(tx);
      tx.sign(keypair);

      const sendResponse = await this.sorobanRpc.sendTransaction(tx);
      if (sendResponse.status === 'ERROR') {
        throw new Error(
          `Submit failed: ${JSON.stringify(sendResponse.errorResult)}`,
        );
      }

      let txStatus;
      for (let i = 0; i < 15; i++) {
        txStatus = await this.sorobanRpc.getTransaction(sendResponse.hash);
        if (txStatus.status !== 'NOT_FOUND') break;
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      if (txStatus?.status !== 'SUCCESS') {
        throw new Error(`Transaction failed on-chain: ${txStatus?.status}`);
      }

      return sendResponse.hash;
    } catch (error) {
      this.logger.error(`Contract invocation failed: ${functionName}`, error);
      throw new InternalServerErrorException(
        `Blockchain interaction failed: ${error.message}`,
      );
    }
  }

  async registerProperty(
    dto: RegisterPropertyDto,
    signerPublicKey: string,
  ): Promise<string> {
    const scArgs = [
      StellarSdk.nativeToScVal(dto.ownerAddress, { type: 'address' }),
      StellarSdk.nativeToScVal(dto.propertyId, { type: 'string' }),
      StellarSdk.nativeToScVal(dto.metadataHash, { type: 'string' }),
    ];

    const txHash = await this.invokeContractFunction(
      signerPublicKey,
      'register_property',
      scArgs,
    );

    const property = this.propertyRegistryRepo.create({
      propertyId: dto.propertyId,
      ownerAddress: dto.ownerAddress,
      metadataHash: dto.metadataHash,
    });
    await this.propertyRegistryRepo.save(property);

    return txHash;
  }

  async verifyProperty(dto: VerifyPropertyDto): Promise<string> {
    const scArgs = [
      StellarSdk.nativeToScVal(dto.verifierAddress, { type: 'address' }),
      StellarSdk.nativeToScVal(dto.propertyId, { type: 'string' }),
    ];

    const txHash = await this.invokeContractFunction(
      dto.verifierAddress,
      'verify_property',
      scArgs,
    );

    const property = await this.propertyRegistryRepo.findOne({
      where: { propertyId: dto.propertyId },
    });
    if (!property)
      throw new NotFoundException('Property not found in local DB');

    property.verified = true;
    property.verifiedBy = dto.verifierAddress;
    property.verifiedAt = new Date();
    await this.propertyRegistryRepo.save(property);

    return txHash;
  }

  async transferProperty(dto: TransferPropertyDto): Promise<string> {
    const property = await this.propertyRegistryRepo.findOne({
      where: { propertyId: dto.propertyId },
    });
    if (!property)
      throw new NotFoundException('Property not found in local DB');

    property.ownerAddress = dto.toAddress;
    await this.propertyRegistryRepo.save(property);

    const history = this.propertyHistoryRepo.create({
      propertyId: dto.propertyId,
      fromAddress: dto.fromAddress,
      toAddress: dto.toAddress,
      transactionHash: 'off-chain-transfer',
    });
    await this.propertyHistoryRepo.save(history);

    return history.transactionHash;
  }

  async getProperty(propertyId: string): Promise<PropertyRegistry | null> {
    return this.propertyRegistryRepo.findOne({ where: { propertyId } });
  }

  async getPropertyCount(): Promise<number> {
    return this.propertyRegistryRepo.count();
  }

  async getPropertyHistory(propertyId: string): Promise<PropertyHistory[]> {
    return this.propertyHistoryRepo.find({
      where: { propertyId },
      order: { transferredAt: 'DESC' },
    });
  }
}
