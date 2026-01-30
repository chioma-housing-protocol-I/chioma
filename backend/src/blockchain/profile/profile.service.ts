import { Injectable, Logger } from '@nestjs/common';
import {
  xdr,
  scValToNative,
  nativeToScVal,
  Address,
  SorobanRpc,
} from '@stellar/stellar-sdk';
import { SorobanClientService } from '../../common/services/soroban-client.service';

export enum AccountType {
  Tenant = 0,
  Landlord = 1,
  Agent = 2,
}

export interface OnChainProfile {
  owner: string;
  version: number;
  accountType: AccountType;
  lastUpdated: number;
  dataHash: string;
  isVerified: boolean;
}

interface NativeProfileData {
  owner: string;
  version: number | bigint;
  account_type: unknown;
  last_updated: number | bigint;
  data_hash: Uint8Array | Buffer;
  is_verified: boolean;
}

@Injectable()
export class ProfileContractService {
  private readonly logger = new Logger(ProfileContractService.name);

  constructor(private sorobanClient: SorobanClientService) {}

  async initProfiles(adminAddress: string): Promise<string> {
    this.sorobanClient.ensureContractId();

    const serverKeypair = this.sorobanClient.getServerKeypair();
    const account = await this.sorobanClient.getAccount(
      serverKeypair.publicKey(),
    );
    const contract = this.sorobanClient.getContract();

    const transaction = this.sorobanClient
      .createTransactionBuilder(account)
      .addOperation(
        contract.call('init_profiles', new Address(adminAddress).toScVal()),
      )
      .setTimeout(30)
      .build();

    return await this.sorobanClient.submitTransaction(
      transaction,
      serverKeypair,
    );
  }

  async createProfile(
    ownerAddress: string,
    accountType: AccountType,
    dataHash: Buffer,
  ): Promise<string> {
    this.sorobanClient.ensureContractId();

    const serverKeypair = this.sorobanClient.getServerKeypair();
    const account = await this.sorobanClient.getAccount(
      serverKeypair.publicKey(),
    );
    const contract = this.sorobanClient.getContract();

    const accountTypeScVal = this.accountTypeToScVal(accountType);
    const dataHashScVal = nativeToScVal(dataHash, { type: 'bytes' });

    const transaction = this.sorobanClient
      .createTransactionBuilder(account)
      .addOperation(
        contract.call(
          'create_profile',
          new Address(ownerAddress).toScVal(),
          accountTypeScVal,
          dataHashScVal,
        ),
      )
      .setTimeout(30)
      .build();

    return await this.sorobanClient.submitTransaction(
      transaction,
      serverKeypair,
    );
  }

  async updateProfile(
    ownerAddress: string,
    accountType?: AccountType,
    dataHash?: Buffer,
  ): Promise<string> {
    this.sorobanClient.ensureContractId();

    const serverKeypair = this.sorobanClient.getServerKeypair();
    const account = await this.sorobanClient.getAccount(
      serverKeypair.publicKey(),
    );
    const contract = this.sorobanClient.getContract();

    const accountTypeScVal =
      accountType !== undefined
        ? xdr.ScVal.scvVec([this.accountTypeToScVal(accountType)])
        : xdr.ScVal.scvVoid();

    const dataHashScVal = dataHash
      ? xdr.ScVal.scvVec([nativeToScVal(dataHash, { type: 'bytes' })])
      : xdr.ScVal.scvVoid();

    const transaction = this.sorobanClient
      .createTransactionBuilder(account)
      .addOperation(
        contract.call(
          'update_profile',
          new Address(ownerAddress).toScVal(),
          accountTypeScVal,
          dataHashScVal,
        ),
      )
      .setTimeout(30)
      .build();

    return await this.sorobanClient.submitTransaction(
      transaction,
      serverKeypair,
    );
  }

  async getProfile(ownerAddress: string): Promise<OnChainProfile | null> {
    this.sorobanClient.ensureContractId();

    const serverKeypair = this.sorobanClient.getServerKeypair();
    const account = await this.sorobanClient.getAccount(
      serverKeypair.publicKey(),
    );
    const contract = this.sorobanClient.getContract();

    const transaction = this.sorobanClient
      .createTransactionBuilder(account)
      .addOperation(
        contract.call('get_profile', new Address(ownerAddress).toScVal()),
      )
      .setTimeout(30)
      .build();

    const simulateResponse =
      await this.sorobanClient.simulateTransaction(transaction);

    if (SorobanRpc.Api.isSimulationError(simulateResponse)) {
      this.logger.error(`Simulation error: ${simulateResponse.error}`);
      return null;
    }

    if (!SorobanRpc.Api.isSimulationSuccess(simulateResponse)) {
      return null;
    }

    const result = simulateResponse.result;
    if (!result) {
      return null;
    }

    return this.parseProfileResult(result.retval);
  }

  async verifyProfile(
    adminAddress: string,
    ownerAddress: string,
  ): Promise<string> {
    this.sorobanClient.ensureContractId();

    const serverKeypair = this.sorobanClient.getServerKeypair();
    const account = await this.sorobanClient.getAccount(
      serverKeypair.publicKey(),
    );
    const contract = this.sorobanClient.getContract();

    const transaction = this.sorobanClient
      .createTransactionBuilder(account)
      .addOperation(
        contract.call(
          'verify_profile',
          new Address(adminAddress).toScVal(),
          new Address(ownerAddress).toScVal(),
        ),
      )
      .setTimeout(30)
      .build();

    return await this.sorobanClient.submitTransaction(
      transaction,
      serverKeypair,
    );
  }

  async hasProfile(ownerAddress: string): Promise<boolean> {
    this.sorobanClient.ensureContractId();

    const serverKeypair = this.sorobanClient.getServerKeypair();
    const account = await this.sorobanClient.getAccount(
      serverKeypair.publicKey(),
    );
    const contract = this.sorobanClient.getContract();

    const transaction = this.sorobanClient
      .createTransactionBuilder(account)
      .addOperation(
        contract.call('has_profile', new Address(ownerAddress).toScVal()),
      )
      .setTimeout(30)
      .build();

    const simulateResponse =
      await this.sorobanClient.simulateTransaction(transaction);

    if (SorobanRpc.Api.isSimulationError(simulateResponse)) {
      this.logger.error(`Simulation error: ${simulateResponse.error}`);
      return false;
    }

    if (!SorobanRpc.Api.isSimulationSuccess(simulateResponse)) {
      return false;
    }

    const result = simulateResponse.result;
    if (!result) {
      return false;
    }

    return scValToNative(result.retval) as boolean;
  }

  private accountTypeToScVal(accountType: AccountType): xdr.ScVal {
    const enumName = AccountType[accountType];
    return xdr.ScVal.scvVec([xdr.ScVal.scvSymbol(enumName)]);
  }

  private parseProfileResult(scVal: xdr.ScVal): OnChainProfile | null {
    try {
      const native = scValToNative(scVal) as NativeProfileData | null;

      if (!native) {
        return null;
      }

      return {
        owner: native.owner,
        version: Number(native.version),
        accountType: this.parseAccountType(native.account_type),
        lastUpdated: Number(native.last_updated),
        dataHash: Buffer.from(native.data_hash).toString('hex'),
        isVerified: native.is_verified,
      };
    } catch (error) {
      this.logger.error(`Failed to parse profile result: ${String(error)}`);
      return null;
    }
  }

  private parseAccountType(value: unknown): AccountType {
    if (typeof value === 'number') {
      return value as AccountType;
    }
    if (typeof value === 'string') {
      switch (value.toLowerCase()) {
        case 'tenant':
          return AccountType.Tenant;
        case 'landlord':
          return AccountType.Landlord;
        case 'agent':
          return AccountType.Agent;
        default:
          return AccountType.Tenant;
      }
    }
    return AccountType.Tenant;
  }
}
