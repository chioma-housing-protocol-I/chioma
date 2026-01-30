import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinataSDK } from 'pinata';
import * as crypto from 'crypto';

export interface ProfileIpfsData {
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  metadata: Record<string, unknown> | null;
  walletAddress: string;
  timestamp: number;
}

export interface IpfsUploadResult {
  cid: string;
  dataHash: string;
  size: number;
  url: string;
}

@Injectable()
export class IpfsService {
  private readonly logger = new Logger(IpfsService.name);
  private readonly pinata: PinataSDK | null = null;
  private readonly pinataGateway: string;

  constructor(private configService: ConfigService) {
    const pinataJwt = this.configService.get<string>('PINATA_JWT', '');
    this.pinataGateway = this.configService.get<string>(
      'PINATA_GATEWAY',
      'gateway.pinata.cloud',
    );

    if (pinataJwt) {
      this.pinata = new PinataSDK({
        pinataJwt,
        pinataGateway: this.pinataGateway,
      });
      this.logger.log('Pinata SDK initialized');
    } else {
      this.logger.warn(
        'PINATA_JWT not configured - IPFS features will be disabled',
      );
    }
  }

  isConfigured(): boolean {
    return this.pinata !== null;
  }

  async uploadProfileData(data: ProfileIpfsData): Promise<IpfsUploadResult> {
    if (!this.pinata) {
      throw new BadRequestException(
        'IPFS service not configured. Set PINATA_JWT environment variable.',
      );
    }

    const jsonData = this.createDeterministicJson(data);
    const dataHash = this.computeSha256Hash(jsonData);

    try {
      const upload = await this.pinata.upload.public
        .json(data)
        .name(`profile-${data.walletAddress}`)
        .keyvalues({
          walletAddress: data.walletAddress,
          dataHash: dataHash,
          type: 'user-profile',
        });

      this.logger.log(
        `Profile data uploaded to IPFS: ${upload.cid} for wallet ${data.walletAddress}`,
      );

      return {
        cid: upload.cid,
        dataHash: dataHash,
        size: upload.size,
        url: `https://${this.pinataGateway}/ipfs/${upload.cid}`,
      };
    } catch (error) {
      this.logger.error(`IPFS upload error: ${String(error)}`);
      throw new BadRequestException('Failed to upload profile data to IPFS');
    }
  }

  async getProfileData(cid: string): Promise<ProfileIpfsData | null> {
    if (!cid) {
      return null;
    }

    if (!this.pinata) {
      this.logger.warn('Pinata SDK not configured for fetching profile data');
      return null;
    }

    try {
      const response = await this.pinata.gateways.public.get(cid);
      if (response.contentType === 'application/json' && response.data) {
        return (
          typeof response.data === 'string'
            ? JSON.parse(response.data)
            : response.data
        ) as ProfileIpfsData;
      }
      return null;
    } catch (error) {
      this.logger.error(`IPFS fetch error for ${cid}: ${String(error)}`);
      return null;
    }
  }

  async verifyDataIntegrity(
    cid: string,
    expectedHash: string,
  ): Promise<boolean> {
    const data = await this.getProfileData(cid);
    if (!data) {
      return false;
    }

    const jsonData = this.createDeterministicJson(data);
    const computedHash = this.computeSha256Hash(jsonData);

    return computedHash === expectedHash;
  }

  private createDeterministicJson(data: ProfileIpfsData): string {
    const normalized = {
      avatarUrl: data.avatarUrl || '',
      bio: data.bio || '',
      displayName: data.displayName || '',
      metadata: data.metadata
        ? JSON.stringify(data.metadata, Object.keys(data.metadata).sort())
        : '',
      timestamp: data.timestamp,
      walletAddress: data.walletAddress,
    };

    return JSON.stringify(normalized, Object.keys(normalized).sort());
  }

  private computeSha256Hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  computeDataHashBuffer(data: ProfileIpfsData): Buffer {
    const jsonData = this.createDeterministicJson(data);
    return crypto.createHash('sha256').update(jsonData).digest();
  }

  computeDataHashHex(data: ProfileIpfsData): string {
    const jsonData = this.createDeterministicJson(data);
    return crypto.createHash('sha256').update(jsonData).digest('hex');
  }

  getGatewayUrl(cid: string): string {
    return `https://${this.pinataGateway}/ipfs/${cid}`;
  }
}
