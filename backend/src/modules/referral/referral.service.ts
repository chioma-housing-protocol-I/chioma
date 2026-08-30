import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryFailedError } from 'typeorm';
import { Referral, ReferralStatus } from './entities/referral.entity';
import { User } from '../users/entities/user.entity';
import { StellarService } from '../stellar/services/stellar.service';
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

    // Trigger reward distribution
    await this.distributeReward(referral);
  }

  private async distributeReward(referral: Referral): Promise<void> {
    const rewardAmount = this.configService.get<number>(
      'REFERRAL_REWARD_AMOUNT',
      10,
    ); // Default 10 units
    const rewardAsset = this.configService.get<string>(
      'REFERRAL_REWARD_ASSET',
      'USDC',
    );

    // In a real scenario, we would use StellarService to send the reward
    // This is a placeholder for the Stellar integration
    try {
      this.logger.log(
        `Distributing reward of ${rewardAmount} ${rewardAsset} to referrer ${referral.referrerId}`,
      );

      const referrer = await this.userRepository.findOne({
        where: { id: referral.referrerId },
      });
      if (!referrer || !referrer.walletAddress) {
        this.logger.error(
          `Referrer ${referral.referrerId} has no wallet address`,
        );
        return;
      }

      // Placeholder for Stellar distribution
      // const txHash = await this.stellarService.sendPayment(
      //   referrer.walletAddress,
      //   rewardAsset,
      //   rewardAmount.toString()
      // );

      // Simulate a tx hash for now
      const txHash =
        'fake_stellar_tx_hash_' + Math.random().toString(36).substring(7);

      referral.status = ReferralStatus.REWARDED;
      referral.rewardAmount = rewardAmount;
      referral.rewardTxHash = txHash;
      await this.referralRepository.save(referral);

      this.logger.log(`Reward distributed successfully. Tx Hash: ${txHash}`);
    } catch (error) {
      this.logger.error(`Failed to distribute reward: ${error.message}`);
    }
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
