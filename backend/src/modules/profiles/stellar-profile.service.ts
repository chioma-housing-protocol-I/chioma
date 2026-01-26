import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  decodeProfileMapFromScValXdr,
  SEP29_PROFILE_DATA_KEY,
} from './utils/sep29';

@Injectable()
export class StellarProfileService {
  private readonly horizonUrl: string;
  private readonly dataKey: string;

  constructor(private readonly configService: ConfigService) {
    this.horizonUrl = this.configService.get<string>(
      'STELLAR_HORIZON_URL',
      'https://horizon-testnet.stellar.org',
    );
    this.dataKey = this.configService.get<string>(
      'STELLAR_PROFILE_DATA_KEY',
      SEP29_PROFILE_DATA_KEY,
    );

    if (this.dataKey.length > 64) {
      throw new Error('Stellar account data key exceeds 64 bytes');
    }
  }

  async submitSignedTransaction(signedXdr: string): Promise<string> {
    if (!signedXdr) {
      throw new BadRequestException('Invalid signed XDR');
    }

    const params = new URLSearchParams();
    params.set('tx', signedXdr);

    const response = await axios.post(
      `${this.horizonUrl}/transactions`,
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    const hash = response.data?.hash;
    if (!hash) {
      throw new BadRequestException('Transaction submission failed');
    }
    return hash;
  }

  async getOnChainProfile(accountId: string) {
    const response = await axios.get(
      `${this.horizonUrl}/accounts/${accountId}`,
    );
    const dataValue = response.data?.data?.[this.dataKey];

    if (!dataValue) {
      return null;
    }

    return decodeProfileMapFromScValXdr(dataValue);
  }

  getDataKey() {
    return this.dataKey;
  }
}
