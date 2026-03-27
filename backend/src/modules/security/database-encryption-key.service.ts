import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

interface DatabaseEncryptionSecret {
  key: string;
  version: number;
}

@Injectable()
export class DatabaseEncryptionKeyService {
  private readonly logger = new Logger(DatabaseEncryptionKeyService.name);
  private readonly client: SecretsManagerClient | null;

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get<string>('AWS_REGION');
    this.client = region ? new SecretsManagerClient({ region }) : null;
  }

  async getActiveKey(): Promise<DatabaseEncryptionSecret> {
    const secretId = this.configService.get<string>(
      'DB_ENCRYPTION_SECRET_ID',
      '',
    );
    if (!secretId || !this.client) {
      const key = this.configService.get<string>('DB_ENCRYPTION_KEY');
      const version = Number(
        this.configService.get<string>('DB_ENCRYPTION_KEY_VERSION', '1'),
      );
      if (!key) {
        throw new Error(
          'DB_ENCRYPTION_KEY or DB_ENCRYPTION_SECRET_ID must be configured',
        );
      }
      return { key, version };
    }

    const response = await this.client.send(
      new GetSecretValueCommand({ SecretId: secretId }),
    );
    if (!response.SecretString) {
      throw new Error(`Secret ${secretId} does not contain SecretString`);
    }

    const parsed = JSON.parse(response.SecretString) as Partial<{
      key: string;
      version: number;
    }>;
    if (!parsed.key) {
      throw new Error(`Secret ${secretId} must contain 'key'`);
    }

    return {
      key: parsed.key,
      version: parsed.version ?? 1,
    };
  }

  async getRotationInfo(): Promise<{ enabled: boolean; intervalDays: number }> {
    const intervalDays = Number(
      this.configService.get<string>('DB_ENCRYPTION_ROTATION_DAYS', '90'),
    );
    this.logger.debug(
      `DB encryption rotation configured: ${intervalDays} days`,
    );
    return { enabled: true, intervalDays };
  }
}
