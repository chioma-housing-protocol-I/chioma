import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Contract, SorobanRpc, xdr, Address } from '@stellar/stellar-sdk';
import * as StellarSdk from '@stellar/stellar-sdk';

export interface MintObligationParams {
  agreementId: string;
  adminAddress: string;
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

export interface BurnObligationParams {
  tokenId: string;
  reason: string;
  ownerAddress: string;
}

export interface AdminReassignObligationParams {
  agreementId: string;
  newOwnerAddress: string;
  adminAddress: string;
}

export interface BurnRecordData {
  tokenId: string;
  burnedBy: string;
  burnedAt: number;
  reason: string;
}

@Injectable()
export class RentObligationNftService {
  private readonly logger = new Logger(RentObligationNftService.name);
  private readonly server: SorobanRpc.Server;
  private readonly contract?: Contract;
  private readonly networkPassphrase: string;
  private readonly adminKeypair?: StellarSdk.Keypair;
  private readonly isConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
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

  async mintObligation(
    params: MintObligationParams,
  ): Promise<{ txHash: string; obligationId: string }> {
    try {
      if (!this.isConfigured || !this.contract) {
        throw new Error('Contract not configured');
      }
      const adminAddress = new Address(params.adminAddress);
      const agreementIdScVal = xdr.ScVal.scvString(params.agreementId);
      const adminScVal = adminAddress.toScVal();

      const tx = await this.buildTransaction(
        'mint_obligation',
        [agreementIdScVal, adminScVal],
        params.adminAddress,
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

  async burnObligation(
    params: BurnObligationParams,
  ): Promise<{ txHash: string }> {
    try {
      if (!this.isConfigured || !this.contract) {
        throw new Error('Contract not configured');
      }
      const tokenIdScVal = xdr.ScVal.scvString(params.tokenId);
      const reasonScVal = xdr.ScVal.scvString(params.reason);

      const tx = await this.buildTransaction(
        'burn_nft',
        [tokenIdScVal, reasonScVal],
        params.ownerAddress,
      );

      const response = await this.server.sendTransaction(tx);

      this.logger.log(
        `Burned rent obligation NFT ${params.tokenId} (reason: ${params.reason})`,
      );

      return { txHash: response.hash };
    } catch (error) {
      this.logger.error(`Failed to burn obligation ${params.tokenId}`, error);
      throw error;
    }
  }

  async adminReassignObligation(
    params: AdminReassignObligationParams,
  ): Promise<{ txHash: string }> {
    try {
      if (!this.isConfigured || !this.contract) {
        throw new Error('Contract not configured');
      }
      const adminAddress = new Address(params.adminAddress);
      const newOwnerAddress = new Address(params.newOwnerAddress);
      const agreementIdScVal = xdr.ScVal.scvString(params.agreementId);

      const tx = await this.buildTransaction(
        'admin_reassign_obligation',
        [adminAddress.toScVal(), agreementIdScVal, newOwnerAddress.toScVal()],
        params.adminAddress,
      );

      const response = await this.server.sendTransaction(tx);

      this.logger.log(
        `Admin reassigned obligation ${params.agreementId} to ${params.newOwnerAddress}`,
      );

      return { txHash: response.hash };
    } catch (error) {
      this.logger.error(
        `Failed to admin-reassign obligation ${params.agreementId}`,
        error,
      );
      throw error;
    }
  }

  async canBurn(tokenId: string): Promise<boolean> {
    try {
      if (!this.isConfigured || !this.contract) {
        return false;
      }
      const tokenIdScVal = xdr.ScVal.scvString(tokenId);
      const result = this.contract.call('can_burn', tokenIdScVal);

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
      this.logger.error(`Failed to check can_burn for ${tokenId}`, error);
      return false;
    }
  }

  async getBurnRecord(tokenId: string): Promise<BurnRecordData | null> {
    try {
      if (!this.isConfigured || !this.contract) {
        return null;
      }
      const tokenIdScVal = xdr.ScVal.scvString(tokenId);
      const result = this.contract.call('get_burn_record', tokenIdScVal);

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
        return this.parseBurnRecord(simulated.result.retval);
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to get burn record for ${tokenId}`, error);
      return null;
    }
  }

  async getBurnedNfts(ownerAddress: string): Promise<string[]> {
    try {
      if (!this.isConfigured || !this.contract) {
        return [];
      }
      const ownerScVal = new Address(ownerAddress).toScVal();
      const result = this.contract.call('get_burned_nfts', ownerScVal);

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
        simulated.result?.retval?.switch().name === 'scvVec'
      ) {
        const vec = simulated.result.retval.vec() || [];
        return vec
          .filter((entry) => entry.switch().name === 'scvString')
          .map((entry) => entry.str().toString());
      }

      return [];
    } catch (error) {
      this.logger.error(`Failed to get burned nfts for ${ownerAddress}`, error);
      return [];
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

  private parseBurnRecord(scVal: xdr.ScVal): BurnRecordData | null {
    try {
      const map = scVal.map();
      if (!map) return null;

      const data: Partial<BurnRecordData> = {};

      map.forEach((entry) => {
        const key = entry.key();
        const val = entry.val();

        if (key.switch().name !== 'scvString') {
          return;
        }

        const keyStr = key.str().toString();

        switch (keyStr) {
          case 'token_id':
            if (val.switch().name === 'scvString') {
              data.tokenId = val.str().toString();
            }
            break;
          case 'burned_by':
            data.burnedBy = Address.fromScVal(val).toString();
            break;
          case 'burned_at':
            if (val.switch().name === 'scvU64') {
              data.burnedAt = Number(val.u64());
            }
            break;
          case 'reason':
            if (val.switch().name === 'scvString') {
              data.reason = val.str().toString();
            }
            break;
        }
      });

      return data as BurnRecordData;
    } catch (error) {
      this.logger.error('Failed to parse burn record', error);
      return null;
    }
  }
}
