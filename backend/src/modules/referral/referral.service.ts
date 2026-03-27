import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Referral, ReferralStatus } from './entities/referral.entity';
import { User } from '../users/entities/user.entity';
import { StellarService } from '../stellar/services/stellar.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

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

  async trackReferral(referredUser: User, referralCode: string): Promise<void> {
    const referrer = await this.userRepository.findOne({
      where: { referralCode },
    });
    if (!referrer) {
      this.logger.warn(
        `Referral code ${referralCode} not found for user ${referredUser.id}`,
      );
      return;
    }

    if (referrer.id === referredUser.id) {
      this.logger.warn(`User ${referredUser.id} tried to refer themselves`);
      return;
    }

    const referral = this.referralRepository.create({
      referrerId: referrer.id,
      referredId: referredUser.id,
      status: ReferralStatus.PENDING,
    });

    await this.referralRepository.save(referral);

    // Update referred user
    await this.userRepository.update(referredUser.id, {
      referredById: referrer.id,
    });

    this.logger.log(
      `Tracked referral: ${referrer.id} referred ${referredUser.id}`,
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
