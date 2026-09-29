import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Contract, SorobanRpc, xdr, Address } from '@stellar/stellar-sdk';
import * as StellarSdk from '@stellar/stellar-sdk';
import {
  assertSorobanSubmissionAccepted,
  waitForSorobanTransactionSuccess,
  SorobanTransactionFailedError,
  SorobanTransactionTimeoutError,
} from './soroban-transaction-poller';
import { BlockchainTransactionError } from '../../../common/errors';

// ── Retry constants ───────────────────────────────────────────────────────────

/** Maximum number of submission attempts for NFT write operations. */
const NFT_TX_MAX_ATTEMPTS = 5;

/** Initial backoff delay in ms between retries. */
const NFT_TX_INITIAL_BACKOFF_MS = 1_000;

/** Exponential backoff multiplier. */
const NFT_TX_BACKOFF_MULTIPLIER = 2;

/** Hard ceiling on any single retry delay. */
const NFT_TX_MAX_BACKOFF_MS = 30_000;

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
    if (!this.isConfigured || !this.contract) {
      throw new Error('Contract not configured');
    }

    const adminAddress = new Address(params.adminAddress);
    const agreementIdScVal = xdr.ScVal.scvString(params.agreementId);
    const adminScVal = adminAddress.toScVal();

    const txHash = await this.submitWithRetry(
      'mint_obligation',
      [agreementIdScVal, adminScVal],
      params.adminAddress,
      `mint_obligation(${params.agreementId})`,
    );

    this.logger.log(
      `Minted rent obligation NFT for agreement ${params.agreementId}, txHash: ${txHash}`,
    );

    return { txHash, obligationId: params.agreementId };
  }

  async transferObligation(
    params: TransferObligationParams,
  ): Promise<{ txHash: string }> {
    if (!this.isConfigured || !this.contract) {
      throw new Error('Contract not configured');
    }

    const fromAddress = new Address(params.fromAddress);
    const toAddress = new Address(params.toAddress);
    const agreementIdScVal = xdr.ScVal.scvString(params.agreementId);

    const txHash = await this.submitWithRetry(
      'transfer_obligation',
      [fromAddress.toScVal(), toAddress.toScVal(), agreementIdScVal],
      params.fromAddress,
      `transfer_obligation(${params.agreementId})`,
    );

    this.logger.log(
      `Transferred obligation ${params.agreementId} from ${params.fromAddress} to ${params.toAddress}, txHash: ${txHash}`,
    );

    return { txHash };
  }

  async burnObligation(
    params: BurnObligationParams,
  ): Promise<{ txHash: string }> {
    if (!this.isConfigured || !this.contract) {
      throw new Error('Contract not configured');
    }

    const tokenIdScVal = xdr.ScVal.scvString(params.tokenId);
    const reasonScVal = xdr.ScVal.scvString(params.reason);

    const txHash = await this.submitWithRetry(
      'burn_nft',
      [tokenIdScVal, reasonScVal],
      params.ownerAddress,
      `burn_nft(${params.tokenId})`,
    );

    this.logger.log(
      `Burned rent obligation NFT ${params.tokenId} (reason: ${params.reason}), txHash: ${txHash}`,
    );

    return { txHash };
  }

  async adminReassignObligation(
    params: AdminReassignObligationParams,
  ): Promise<{ txHash: string }> {
    if (!this.isConfigured || !this.contract) {
      throw new Error('Contract not configured');
    }

    const adminAddress = new Address(params.adminAddress);
    const newOwnerAddress = new Address(params.newOwnerAddress);
    const agreementIdScVal = xdr.ScVal.scvString(params.agreementId);

    const txHash = await this.submitWithRetry(
      'admin_reassign_obligation',
      [adminAddress.toScVal(), agreementIdScVal, newOwnerAddress.toScVal()],
      params.adminAddress,
      `admin_reassign_obligation(${params.agreementId})`,
    );

    this.logger.log(
      `Admin reassigned obligation ${params.agreementId} to ${params.newOwnerAddress}, txHash: ${txHash}`,
    );

    return { txHash };
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
        return this.parseObligationData(simulated.result.retval);
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
      this.logger.error(
        `Failed to get burned nfts for ${ownerAddress}`,
        error,
      );
      return [];
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Submits a state-mutating Soroban call with exponential backoff retry.
   *
   * Error classification:
   * - `SorobanTransactionFailedError`  → permanent on-chain failure, no retry
   * - Simulation errors (invalid/validation) → permanent, no retry
   * - `SorobanTransactionTimeoutError` → transient, retried
   * - Network/unknown errors           → transient, retried
   *
   * After all attempts are exhausted the error is re-thrown so the caller
   * (or Bull's blockchain queue processor) can route it to the dead-letter
   * queue for deferred recovery.
   */
  private async submitWithRetry(
    method: string,
    params: xdr.ScVal[],
    sourceAddress: string,
    operationLabel: string,
  ): Promise<string> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= NFT_TX_MAX_ATTEMPTS; attempt++) {
      try {
        const tx = await this.buildTransaction(method, params, sourceAddress);
        const response = await this.server.sendTransaction(tx);

        assertSorobanSubmissionAccepted(response);

        const txHash = response.hash;

        this.logger.log(
          `[${operationLabel}] attempt ${attempt}/${NFT_TX_MAX_ATTEMPTS}: submitted txHash=${txHash}`,
        );

        await waitForSorobanTransactionSuccess(
          this.server,
          txHash,
          this.configService,
        );

        this.logger.log(
          `[${operationLabel}] txHash=${txHash} confirmed successfully`,
        );

        return txHash;
      } catch (error) {
        lastError = error;

        // Permanent on-chain failure — never retry, surfaces immediately
        if (error instanceof SorobanTransactionFailedError) {
          this.logger.error(
            `[${operationLabel}] PERMANENT on-chain failure: txHash=${error.hash}, status=${error.finalStatus ?? 'unknown'}`,
            error.stack,
          );
          throw new BlockchainTransactionError(
            `${operationLabel} failed on-chain (txHash: ${error.hash}, status: ${error.finalStatus ?? 'unknown'})`,
            { operationLabel, txHash: error.hash, finalStatus: error.finalStatus },
          );
        }

        // Permanent contract/validation error from assertSorobanSubmissionAccepted
        if (error instanceof Error) {
          const msg = error.message.toLowerCase();
          if (
            msg.includes('simulation failed') ||
            (msg.includes('soroban submission failed') && msg.includes('error'))
          ) {
            this.logger.error(
              `[${operationLabel}] PERMANENT validation error: ${error.message}`,
            );
            throw error;
          }
        }

        // Transient error (timeout, network, rate-limit) — retry with backoff
        const isTimeout = error instanceof SorobanTransactionTimeoutError;
        this.logger.warn(
          `[${operationLabel}] ${isTimeout ? 'TIMEOUT' : 'TRANSIENT'} error on attempt ${attempt}/${NFT_TX_MAX_ATTEMPTS}: ` +
            (error instanceof Error ? error.message : String(error)),
        );

        if (attempt < NFT_TX_MAX_ATTEMPTS) {
          const delayMs = Math.min(
            NFT_TX_INITIAL_BACKOFF_MS *
              Math.pow(NFT_TX_BACKOFF_MULTIPLIER, attempt - 1),
            NFT_TX_MAX_BACKOFF_MS,
          );
          this.logger.warn(
            `[${operationLabel}] Retrying in ${delayMs}ms (attempt ${attempt + 1}/${NFT_TX_MAX_ATTEMPTS})…`,
          );
          await this.sleep(delayMs);
        }
      }
    }

    // All retries exhausted — throw so the blockchain queue processor can
    // route this job to the dead-letter queue for deferred recovery.
    this.logger.error(
      `[${operationLabel}] All ${NFT_TX_MAX_ATTEMPTS} attempts exhausted. Routing to dead-letter queue.`,
      lastError instanceof Error ? lastError.stack : String(lastError),
    );

    throw new BlockchainTransactionError(
      `${operationLabel} failed after ${NFT_TX_MAX_ATTEMPTS} attempts — queued for dead-letter recovery`,
      {
        operationLabel,
        attempts: NFT_TX_MAX_ATTEMPTS,
        lastError: lastError instanceof Error ? lastError.message : String(lastError),
      },
    );
  }

  /**
   * Validates a Soroban `sendTransaction` response and returns the transaction hash.
   *
   * Throws `BlockchainTransactionError` when `hash` is absent or empty, which can
   * happen if Soroban returns an incomplete response (e.g. a network interruption
   * between submission and acknowledgement).
   *
   * @param response - Raw response from `SorobanRpc.Server.sendTransaction`
   * @param operationLabel - Human-readable label used in the error message
   * @returns The validated transaction hash string
   */
  private extractTransactionHash(
    response: SorobanRpc.Api.SendTransactionResponse,
    operationLabel: string,
  ): string {
    if (!response.hash) {
      throw new BlockchainTransactionError(
        `Soroban returned an incomplete response for "${operationLabel}": transaction hash is missing. ` +
          `Response status: ${response.status ?? 'unknown'}`,
        { operationLabel, responseStatus: response.status },
      );
    }
    return response.hash;
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

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private parseObligationData(scVal: xdr.ScVal): RentObligationData | null {
    try {
      const map = scVal.map();
      if (!map) return null;

      const data: Partial<RentObligationData> = {};

      map.forEach((entry) => {
        const key = entry.key();
        const val = entry.val();

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
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Contract, SorobanRpc, xdr, Address } from '@stellar/stellar-sdk';
import * as StellarSdk from '@stellar/stellar-sdk';
import {
  assertSorobanSubmissionAccepted,
  waitForSorobanTransactionSuccess,
} from './soroban-transaction-poller';
import {
  classifySorobanError,
  sorobanBackoffMs,
} from '../../../common/services/soroban-errors';
import * as StellarSdk from '@stellar/stellar-sdk';
import { BlockchainTransactionError } from '../../../common/errors';

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

      const txHash = await this.submitWithRetry(
        tx,
      const response = await this.server.sendTransaction(tx);
      assertSorobanSubmissionAccepted(response);
      await waitForSorobanTransactionSuccess(
        this.server,
        response.hash,
        this.configService,
      const response = await this.server.sendTransaction(tx);
      const txHash = this.extractTransactionHash(
        response,
        `mint_obligation(${params.agreementId})`,
      );

      this.logger.log(
        `Minted rent obligation NFT for agreement ${params.agreementId}`,
      );

      return {
        txHash,
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

      const txHash = await this.submitWithRetry(
        tx,
      const response = await this.server.sendTransaction(tx);
      assertSorobanSubmissionAccepted(response);
      await waitForSorobanTransactionSuccess(
        this.server,
        response.hash,
        this.configService,
      const response = await this.server.sendTransaction(tx);
      const txHash = this.extractTransactionHash(
        response,
        `transfer_obligation(${params.agreementId})`,
      );

      this.logger.log(
        `Transferred obligation ${params.agreementId} from ${params.fromAddress} to ${params.toAddress}`,
      );

      return { txHash };
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

      const txHash = await this.submitWithRetry(
        tx,
      const response = await this.server.sendTransaction(tx);
      assertSorobanSubmissionAccepted(response);
      await waitForSorobanTransactionSuccess(
        this.server,
        response.hash,
        this.configService,
      const response = await this.server.sendTransaction(tx);
      const txHash = this.extractTransactionHash(
        response,
        `burn_nft(${params.tokenId})`,
      );

      this.logger.log(
        `Burned rent obligation NFT ${params.tokenId} (reason: ${params.reason})`,
      );

      return { txHash };
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

      const txHash = await this.submitWithRetry(
        tx,
      const response = await this.server.sendTransaction(tx);
      assertSorobanSubmissionAccepted(response);
      await waitForSorobanTransactionSuccess(
        this.server,
        response.hash,
        this.configService,
      const response = await this.server.sendTransaction(tx);
      const txHash = this.extractTransactionHash(
        response,
        `admin_reassign_obligation(${params.agreementId})`,
      );

      this.logger.log(
        `Admin reassigned obligation ${params.agreementId} to ${params.newOwnerAddress}`,
      );

      return { txHash };
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

  /**
   * Submit a transaction and poll until it settles. Retriable failures
   * (network, RPC throttling, poll timeout) are retried with exponential
   * backoff; permanent failures (validation, contract errors) fail fast.
   * Resubmitting the same signed envelope is idempotent (same hash).
   */
  private async submitWithRetry(
    tx: StellarSdk.Transaction,
    operationLabel: string,
  ): Promise<string> {
    const maxAttempts = Number(
      this.configService.get<string>('SOROBAN_TX_MAX_RETRIES', '5'),
    );
    let txHash: string | undefined;

    for (let attempt = 1; ; attempt++) {
      try {
        const response = await this.server.sendTransaction(tx);
        txHash = this.extractTransactionHash(response, operationLabel);
        assertSorobanSubmissionAccepted(response);
        await waitForSorobanTransactionSuccess(
          this.server,
          txHash,
          this.configService,
        );
        return txHash;
      } catch (error) {
        const kind = classifySorobanError(error);
        const reason = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `${operationLabel} attempt ${attempt}/${maxAttempts} failed (${kind}) ` +
            `tx=${txHash ?? 'n/a'}: ${reason}`,
        );
        if (kind === 'permanent' || attempt >= maxAttempts) {
          throw new BlockchainTransactionError(
            `${operationLabel} failed (${kind}) after ${attempt} attempt(s): ${reason}`,
            { operationLabel, txHash, kind, attempts: attempt },
          );
        }
        await new Promise((r) => setTimeout(r, sorobanBackoffMs(attempt)));
      }
    }
  }

  /**
   * Validates a Soroban `sendTransaction` response and returns the transaction hash.
   *
   * Expected response shape (subset of `SorobanRpc.Api.SendTransactionResponse`):
   * ```
   * {
   *   hash:   string;          // hex-encoded transaction hash — REQUIRED
   *   status: string;          // e.g. "PENDING" | "DUPLICATE" | "TRY_AGAIN_LATER" | "ERROR"
   *   errorResultXdr?: string; // present only when status === "ERROR"
   * }
   * ```
   *
   * Throws `BlockchainTransactionError` when `hash` is absent or empty, which can
   * happen if Soroban returns an incomplete response (e.g. a network interruption
   * between submission and acknowledgement).
   *
   * @param response - Raw response from `SorobanRpc.Server.sendTransaction`
   * @param operationLabel - Human-readable label used in the error message
   * @returns The validated transaction hash string
   */
  private extractTransactionHash(
    response: SorobanRpc.Api.SendTransactionResponse,
    operationLabel: string,
  ): string {
    if (!response.hash) {
      throw new BlockchainTransactionError(
        `Soroban returned an incomplete response for "${operationLabel}": transaction hash is missing. ` +
          `Response status: ${response.status ?? 'unknown'}`,
        { operationLabel, responseStatus: response.status },
      );
    }
    return response.hash;
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
