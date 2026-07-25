import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class SessionCleanupService {
  private readonly logger = new Logger(SessionCleanupService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // Run every hour to clean up expired sessions, locks, and tokens
  @Cron(CronExpression.EVERY_HOUR)
  async handleCron() {
    this.logger.log('Starting session and token cleanup...');
    const now = new Date();

    try {
      // 1. Clean up expired reset tokens
      const expiredResetTokensResult = await this.userRepository.update(
        { resetTokenExpires: LessThan(now) },
        { resetToken: null, resetTokenExpires: null },
      );
      if (
        expiredResetTokensResult.affected &&
        expiredResetTokensResult.affected > 0
      ) {
        this.logger.log(
          `Cleaned up ${expiredResetTokensResult.affected} expired reset tokens.`,
        );
      }

      // 2. Unlock accounts whose lockout period has passed
      const expiredLocksResult = await this.userRepository.update(
        { accountLockedUntil: LessThan(now) },
        { accountLockedUntil: null, failedLoginAttempts: 0 },
      );
      if (expiredLocksResult.affected && expiredLocksResult.affected > 0) {
        this.logger.log(
          `Unlocked ${expiredLocksResult.affected} previously locked accounts.`,
        );
      }

      this.logger.log('Session and token cleanup completed.');
    } catch (error: any) {
      this.logger.error(`Failed during session cleanup: ${error.message}`);
    }
  }
}
