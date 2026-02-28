import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Kyc, KycStatus } from './kyc.entity';
import { SubmitKycDto, KycWebhookDto } from './kyc.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class KycService {
  constructor(
    @InjectRepository(Kyc)
    private readonly kycRepository: Repository<Kyc>,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {}

  async submitKyc(userId: string, dto: SubmitKycDto): Promise<Kyc> {
    // TODO: Encrypt KYC data before saving
    const encryptedKycData = this.encryptKycData(dto.kycData);
    const kyc = this.kycRepository.create({
      userId,
      encryptedKycData,
      status: KycStatus.PENDING,
    });
    await this.usersService.setKycStatus(userId, KycStatus.PENDING);
    return this.kycRepository.save(kyc);
  }

  async getKycStatus(userId: string): Promise<Kyc | null> {
    return this.kycRepository.findOne({ where: { userId } });
  }

  async handleWebhook(dto: KycWebhookDto): Promise<void> {
    const kyc = await this.kycRepository.findOne({
      where: { providerReference: dto.providerReference },
    });
    if (!kyc) return;
    kyc.status = dto.status;
    await this.kycRepository.save(kyc);
    await this.usersService.setKycStatus(kyc.userId, dto.status);
  }

  private encryptKycData(data: Record<string, any>): Record<string, any> {
    // TODO: Implement encryption logic
    return data;
  }
}
