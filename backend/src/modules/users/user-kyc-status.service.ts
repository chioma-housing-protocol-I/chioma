import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { KycStatus } from '../kyc/kyc-status.enum';

@Injectable()
export class UserKycStatusService {
  private readonly logger = new Logger(UserKycStatusService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async setStatus(userId: string, status: KycStatus): Promise<void> {
    await this.userRepository.update(userId, { kycStatus: status });
    this.logger.log(`KYC status updated for user ${userId}: ${status}`);
  }
}
