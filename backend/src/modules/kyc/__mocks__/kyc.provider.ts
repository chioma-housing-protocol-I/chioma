// Mock KYC provider integration for development/testing
import { Injectable } from '@nestjs/common';
import { KycStatus } from '../kyc.entity';

@Injectable()
export class MockKycProvider {
  async submitKyc(
    _kycData: Record<string, any>,
  ): Promise<{ providerReference: string; status: KycStatus }> {
    // Simulate provider reference and always return PENDING
    return {
      providerReference: `mock-ref-${Date.now()}`,
      status: KycStatus.PENDING,
    };
  }
}
