import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryFailedError } from 'typeorm';
import { Referral, ReferralStatus } from './entities/referral.entity';
import { User } from '../users/entities/user.entity';
import { StellarService } from '../stellar/services/stellar.service';
import { AssetType } from '../stellar/entities/stellar-transaction.entity';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { SystemError } from '../../common/errors/domain-errors';
import { ErrorCode } from '../../common/errors/error-codes';

/** Postgres unique_violation error code. */
const POSTGRES_UNIQUE_VIOLATION = '23505';

/** Bounded attempts for referral code generation before giving up. */
const MAX_CODE_GENERATION_ATTEMPTS = 5;

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    (error as unknown as { code?: string }).code === POSTGRES_UNIQUE_VIOLATION
  );
}

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);

  private generateCode(): string {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
  }

  constructor(
    @InjectRepository(Referral)
    private readonly referralRepository: Repository<Referral>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly stellarService: StellarService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Generates a referral code that is not currently in use. This is a
   * best-effort pre-check only (find-then-generate is inherently racy
   * under concurrent registration) — the code returned here can still
   * collide with one assigned by a concurrent request between this check
   * and the eventual save. Callers that persist the code MUST use
   * {@link assignUniqueReferralCode} (or otherwise retry on a `23505`
   * unique-violation) rather than trusting this method's result alone.
   */
  async generateReferralCode(): Promise<string> {
    let code: string;
    let exists = true;
    while (exists) {
      code = this.generateCode();
      const user = await this.userRepository.findOne({
        where: { referralCode: code },
      });
      if (!user) {
        exists = false;
        return code;
      }
    }
    return ''; // Should not happen
  }

  /**
   * Generates a referral code and persists it via `save`, retrying with a
   * fresh code on a genuine unique-constraint collision (Postgres
   * `23505`) — the only way to definitively detect a collision, since the
   * pre-check in {@link generateReferralCode} can race with a concurrent
   * registration. Bounded to {@link MAX_CODE_GENERATION_ATTEMPTS} attempts;
   * exhausting them raises a {@link SystemError} rather than looping
   * forever or leaking a raw database constraint error to the caller.
   *
   * `save` is the caller-supplied persistence step (e.g.
   * `userRepository.save`) so this helper stays agnostic to what entity
   * the code is being assigned to.
   */
  async assignUniqueReferralCode<T>(
    save: (code: string) => Promise<T>,
  ): Promise<{ code: string; result: T }> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_CODE_GENERATION_ATTEMPTS; attempt++) {
      const code = await this.generateReferralCode();
      try {
        const result = await save(code);
        if (attempt > 1) {
          this.logger.warn(
            `Referral code assigned after ${attempt} attempts (collision retry)`,
          );
        }
        return { code, result };
      } catch (error) {
        if (!isUniqueViolation(error)) {
          throw error;
        }
        lastError = error;
        this.logger.warn(
          `Referral code collision on attempt ${attempt}/${MAX_CODE_GENERATION_ATTEMPTS} (code: ${code})`,
        );
      }
    }

    this.logger.error(
      `Failed to generate a unique referral code after ${MAX_CODE_GENERATION_ATTEMPTS} attempts`,
    );
    throw new SystemError(
      ErrorCode.INTERNAL_SERVER_ERROR,
      'Could not generate a unique referral code. Please try again.',
      true,
      {
        attempts: MAX_CODE_GENERATION_ATTEMPTS,
        cause: (lastError as Error)?.message,
      },
    );
  }

  async trackReferral(
    referredUserId: string,
    referralCode: string,
  ): Promise<void> {
    const referrer = await this.userRepository.findOne({
      where: { referralCode },
    });
    if (!referrer) {
      this.logger.warn(
        `Referral code ${referralCode} not found for user ${referredUserId}`,
      );
      return;
    }

    if (referrer.id === referredUserId) {
      this.logger.warn(`User ${referredUserId} tried to refer themselves`);
      return;
    }

    const referral = this.referralRepository.create({
      referrerId: referrer.id,
      referredId: referredUserId,
      status: ReferralStatus.PENDING,
    });

    await this.referralRepository.save(referral);

    // Update referred user
    await this.userRepository.update(referredUserId, {
      referredById: referrer.id,
    });

    this.logger.log(
      `Tracked referral: ${referrer.id} referred ${referredUserId}`,
    );
  }

  async completeReferral(referredUserId: string): Promise<void> {
    const referral = await this.referralRepository.findOne({
      where: { referredId: referredUserId, status: ReferralStatus.PENDING },
    });

    if (!referral) {
      this.logger.warn(`No pending referral found for user ${referredUserId}`);
      return;
    }

    referral.status = ReferralStatus.COMPLETED;
    referral.convertedAt = new Date();
    await this.referralRepository.save(referral);

    this.logger.log(`Referral completed for user ${referredUserId}`);

    // Trigger reward distribution. distributeReward never throws past this
    // point — on any failure (misconfiguration, missing wallet, or a real
    // Stellar payment error) it marks the referral REWARD_FAILED and
    // returns, so completeReferral does not need its own try/catch here.
    // See distributeReward's doc comment for why this is swallow-after-mark
    // rather than re-throw.
    await this.distributeReward(referral);
  }

  /**
   * Parses this codebase's established `CODE:ISSUER` asset config format
   * (e.g. `ANCHOR_USDC_ASSET=USDC:GA5Z...` in `.env.example`) into a
   * `{ type, code, issuer }` triple suitable for `CreatePaymentDto.asset`.
   * Stellar asset codes of 1-4 characters use `CREDIT_ALPHANUM4`; 5-12
   * characters use `CREDIT_ALPHANUM12`.
   *
   * Returns `null` if the configured string is missing or malformed, so
   * callers can fail the payout clearly rather than sending a malformed
   * asset to `sendPayment`.
   */
  private parseAssetConfig(
    assetConfig: string | undefined,
  ): { type: AssetType; code: string; issuer: string } | null {
    if (!assetConfig) {
      return null;
    }
    const [code, issuer] = assetConfig.split(':');
    if (!code || !issuer) {
      return null;
    }
    return {
      type:
        code.length <= 4
          ? AssetType.CREDIT_ALPHANUM4
          : AssetType.CREDIT_ALPHANUM12,
      code,
      issuer,
    };
  }

  /**
   * Resolves the reward asset for `sendPayment`'s `CreatePaymentDto.asset`.
   *
   * - `XLM` (native) needs no issuer and is omitted from the DTO (`sendPayment`
   *   defaults to native XLM when `asset` is undefined).
   * - `USDC` is resolved from the existing `ANCHOR_USDC_ASSET` config value
   *   (`CODE:ISSUER`, the same convention already declared in
   *   `.env.example` / `env.validation.ts` for anchor USDC), reusing that
   *   issuer rather than inventing a new one.
   * - Any other configured `rewardAsset` is currently unsupported: this
   *   codebase has no other known-issuer convention to resolve it from, so
   *   distribution is refused rather than guessing at a financial config
   *   value.
   */
  private resolveRewardAsset(
    rewardAsset: string,
  ): { type: AssetType; code: string; issuer: string } | null | undefined {
    if (rewardAsset === 'XLM') {
      return undefined; // native, no asset object needed
    }
    if (rewardAsset === 'USDC') {
      const usdcConfig = this.configService.get<string>('ANCHOR_USDC_ASSET');
      return this.parseAssetConfig(usdcConfig);
    }
    return null; // unsupported asset — no known issuer convention
  }

  /**
   * Pays out the reward for a COMPLETED referral via a real on-chain
   * Stellar payment, and always leaves the referral in a definitive
   * status:
   *
   * - Success: REWARDED, with the real `transactionHash` from
   *   `sendPayment`'s resolved `StellarTransaction`.
   * - Any failure (payout source not configured, referrer has no wallet,
   *   unsupported/misconfigured reward asset, or `sendPayment` itself
   *   throws — insufficient balance, unregistered source account, network
   *   error, etc.): REWARD_FAILED, with no tx hash written.
   *
   * Design choice — swallow after marking failed, don't re-throw:
   * `completeReferral` calls this fire-and-forget (`await`ed, but with no
   * try/catch of its own) as a side effect of completing a referral: a
   * failed payout must never unwind the already-committed COMPLETED status
   * change or bubble an error back to whatever triggered completion (e.g.
   * an onboarding/KYC flow). Marking REWARD_FAILED on the referral row is
   * the durable record of the failure — the same "log and stop, don't
   * crash the caller" shape this codebase already uses for a background
   * side effect in `RentReconciliationService.runReconciliation` (skips
   * cleanly rather than throwing when `PROTOCOL_WALLET_ADDRESS` is unset).
   * A REWARD_FAILED referral is retryable via {@link retryFailedReward}.
   */
  private async distributeReward(referral: Referral): Promise<void> {
    const rewardAmount = this.configService.get<number>(
      'REFERRAL_REWARD_AMOUNT',
      10,
    ); // Default 10 units
    const rewardAsset = this.configService.get<string>(
      'REFERRAL_REWARD_ASSET',
      'USDC',
    );

    this.logger.log(
      `Distributing reward of ${rewardAmount} ${rewardAsset} to referrer ${referral.referrerId}`,
    );

    const markFailed = async (reason: string): Promise<void> => {
      this.logger.error(
        `Reward distribution failed for referral ${referral.id}: ${reason}`,
      );
      referral.status = ReferralStatus.REWARD_FAILED;
      await this.referralRepository.save(referral);
    };

    const protocolWallet =
      this.configService.get<string>('PROTOCOL_WALLET_ADDRESS') ?? '';
    if (!protocolWallet) {
      await markFailed(
        'PROTOCOL_WALLET_ADDRESS not configured — cannot pay referral rewards',
      );
      return;
    }

    const referrer = await this.userRepository.findOne({
      where: { id: referral.referrerId },
    });
    if (!referrer || !referrer.walletAddress) {
      await markFailed(`Referrer ${referral.referrerId} has no wallet address`);
      return;
    }

    const asset = this.resolveRewardAsset(rewardAsset);
    if (asset === null) {
      await markFailed(
        `Reward asset "${rewardAsset}" is not configured with a known issuer`,
      );
      return;
    }

    try {
      const transaction = await this.stellarService.sendPayment({
        sourcePublicKey: protocolWallet,
        destinationPublicKey: referrer.walletAddress,
        amount: rewardAmount.toFixed(7),
        asset: asset
          ? { type: asset.type, code: asset.code, issuer: asset.issuer }
          : undefined,
      });

      referral.status = ReferralStatus.REWARDED;
      referral.rewardAmount = rewardAmount;
      referral.rewardTxHash = transaction.transactionHash;
      await this.referralRepository.save(referral);

      this.logger.log(
        `Reward distributed successfully. Tx Hash: ${transaction.transactionHash}`,
      );
    } catch (error) {
      await markFailed(error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Retries reward payout for a referral currently stuck in
   * REWARD_FAILED. Scoping note: this codebase has a BullMQ `blockchain`
   * queue convention (`BULL_QUEUE_BLOCKCHAIN_ATTEMPTS`/
   * `BULL_QUEUE_BLOCKCHAIN_BACKOFF_DELAY` in `env.validation.ts`,
   * `BlockchainQueueProcessor` in `queues/processors/blockchain.processor.ts`)
   * that would be a natural home for automatic retries, but wiring reward
   * payout through it is a larger change — a new job type, a processor
   * case, and new coupling between `QueuesModule` and `ReferralModule`
   * (which today only depends on `StellarModule`) — than this fix is
   * scoped to. This method is deliberately left as a plain callable entry
   * point an admin action or a future cron/queue job can invoke; no
   * automatic trigger is wired up in this change.
   */
  async retryFailedReward(referralId: string): Promise<void> {
    const referral = await this.referralRepository.findOne({
      where: { id: referralId, status: ReferralStatus.REWARD_FAILED },
    });

    if (!referral) {
      this.logger.warn(`No REWARD_FAILED referral found for id ${referralId}`);
      return;
    }

    await this.distributeReward(referral);
  }

  async getReferralStats(userId: string) {
    const referrals = await this.referralRepository.find({
      where: { referrerId: userId },
      relations: ['referred'],
    });

    const totalReferrals = referrals.length;
    const completedReferrals = referrals.filter(
      (r) =>
        r.status === ReferralStatus.COMPLETED ||
        r.status === ReferralStatus.REWARDED,
    ).length;
    const totalRewards = referrals.reduce(
      (sum, r) => sum + Number(r.rewardAmount),
      0,
    );

    return {
      totalReferrals,
      completedReferrals,
      totalRewards,
      referrals: referrals.map((r) => ({
        id: r.id,
        referredName: `${r.referred.firstName} ${r.referred.lastName}`,
        status: r.status,
        createdAt: r.createdAt,
        rewardAmount: r.rewardAmount,
      })),
    };
  }
}
