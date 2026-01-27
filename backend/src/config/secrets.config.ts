import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Secrets Configuration
 * Abstraction layer for secrets management
 * Supports environment variables (dev) and cloud secret managers (prod)
 */

export interface SecretsProvider {
  getSecret(key: string): Promise<string | undefined>;
  setSecret(key: string, value: string): Promise<void>;
  deleteSecret(key: string): Promise<void>;
}

/**
 * Environment Variable Secrets Provider
 * For development and simple deployments
 */
@Injectable()
export class EnvSecretsProvider implements SecretsProvider {
  constructor(private configService: ConfigService) {}

  getSecret(key: string): Promise<string | undefined> {
    return Promise.resolve(this.configService.get<string>(key));
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setSecret(key: string, _value: string): Promise<void> {
    // Environment variables cannot be set at runtime
    // This is a no-op for the env provider
    console.warn(`Cannot set secret ${key} at runtime with EnvSecretsProvider`);
    return Promise.resolve();
  }

  deleteSecret(key: string): Promise<void> {
    // Environment variables cannot be deleted at runtime
    console.warn(
      `Cannot delete secret ${key} at runtime with EnvSecretsProvider`,
    );
    return Promise.resolve();
  }
}

/**
 * AWS Secrets Manager Provider (stub)
 * For production deployments on AWS
 */
export class AwsSecretsProvider implements SecretsProvider {
  private readonly secretsManager: any;
  private readonly secretPrefix: string;
  private readonly cache = new Map<
    string,
    { value: string; expires: number }
  >();
  private readonly cacheTtl = 300000; // 5 minutes

  constructor(options?: { region?: string; secretPrefix?: string }) {
    // In a real implementation, you would:
    // const { SecretsManagerClient } = require('@aws-sdk/client-secrets-manager');
    // this.secretsManager = new SecretsManagerClient({ region: options?.region });
    this.secretPrefix = options?.secretPrefix || 'chioma/';
  }

  getSecret(key: string): Promise<string | undefined> {
    // Check cache first
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) {
      return Promise.resolve(cached.value);
    }

    // In a real implementation:
    // const command = new GetSecretValueCommand({ SecretId: this.secretPrefix + key });
    // const response = await this.secretsManager.send(command);
    // const value = response.SecretString;
    // this.cache.set(key, { value, expires: Date.now() + this.cacheTtl });
    // return value;

    // Fallback to environment variable
    return Promise.resolve(process.env[key]);
  }

  setSecret(key: string, value: string): Promise<void> {
    // In a real implementation:
    // const command = new PutSecretValueCommand({
    //   SecretId: this.secretPrefix + key,
    //   SecretString: value,
    // });
    // await this.secretsManager.send(command);
    this.cache.set(key, { value, expires: Date.now() + this.cacheTtl });
    return Promise.resolve();
  }

  deleteSecret(key: string): Promise<void> {
    // In a real implementation:
    // const command = new DeleteSecretCommand({ SecretId: this.secretPrefix + key });
    // await this.secretsManager.send(command);
    this.cache.delete(key);
    return Promise.resolve();
  }
}

/**
 * HashiCorp Vault Provider (stub)
 * For enterprise deployments
 */
export class VaultSecretsProvider implements SecretsProvider {
  private readonly client: any;
  private readonly mountPath: string;
  private readonly cache = new Map<
    string,
    { value: string; expires: number }
  >();
  private readonly cacheTtl = 300000;

  constructor(options?: {
    address?: string;
    token?: string;
    mountPath?: string;
  }) {
    // In a real implementation:
    // const vault = require('node-vault');
    // this.client = vault({ apiVersion: 'v1', endpoint: options?.address, token: options?.token });
    this.mountPath = options?.mountPath || 'secret/data/chioma';
  }

  getSecret(key: string): Promise<string | undefined> {
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) {
      return Promise.resolve(cached.value);
    }

    // In a real implementation:
    // const result = await this.client.read(`${this.mountPath}/${key}`);
    // const value = result.data.data.value;
    // this.cache.set(key, { value, expires: Date.now() + this.cacheTtl });
    // return value;

    return Promise.resolve(process.env[key]);
  }

  setSecret(key: string, value: string): Promise<void> {
    // In a real implementation:
    // await this.client.write(`${this.mountPath}/${key}`, { data: { value } });
    this.cache.set(key, { value, expires: Date.now() + this.cacheTtl });
    return Promise.resolve();
  }

  deleteSecret(key: string): Promise<void> {
    // In a real implementation:
    // await this.client.delete(`${this.mountPath}/${key}`);
    this.cache.delete(key);
    return Promise.resolve();
  }
}

/**
 * Secrets Service
 * Main service for accessing secrets
 */
@Injectable()
export class SecretsService implements OnModuleInit {
  private readonly logger = new Logger(SecretsService.name);
  private provider: SecretsProvider;

  constructor(private configService: ConfigService) {
    // Initialize with environment provider by default
    this.provider = new EnvSecretsProvider(configService);
  }

  async onModuleInit() {
    this.initializeProvider();
    await this.validateRequiredSecrets();
  }

  private initializeProvider(): void {
    const secretsProvider = this.configService.get<string>('SECRETS_PROVIDER');

    switch (secretsProvider) {
      case 'aws':
        this.provider = new AwsSecretsProvider({
          region: this.configService.get<string>('AWS_REGION'),
          secretPrefix: this.configService.get<string>('AWS_SECRETS_PREFIX'),
        });
        this.logger.log('Using AWS Secrets Manager');
        break;

      case 'vault':
        this.provider = new VaultSecretsProvider({
          address: this.configService.get<string>('VAULT_ADDR'),
          token: this.configService.get<string>('VAULT_TOKEN'),
          mountPath: this.configService.get<string>('VAULT_MOUNT_PATH'),
        });
        this.logger.log('Using HashiCorp Vault');
        break;

      default:
        this.provider = new EnvSecretsProvider(this.configService);
        this.logger.log('Using environment variables for secrets');
    }
  }

  private async validateRequiredSecrets() {
    const requiredSecrets = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'DB_PASSWORD'];

    const missingSecrets: string[] = [];

    for (const secret of requiredSecrets) {
      const value = await this.provider.getSecret(secret);
      if (!value) {
        missingSecrets.push(secret);
      }
    }

    if (missingSecrets.length > 0) {
      this.logger.warn(
        `Missing required secrets: ${missingSecrets.join(', ')}`,
      );
    }

    // Warn about default/weak secrets in development
    if (process.env.NODE_ENV !== 'production') {
      const jwtSecret = await this.provider.getSecret('JWT_SECRET');
      if (
        jwtSecret &&
        (jwtSecret.includes('default') || jwtSecret.length < 32)
      ) {
        this.logger.warn(
          'JWT_SECRET appears to be a default or weak value. Use a strong secret in production.',
        );
      }
    }
  }

  /**
   * Get a secret value
   */
  async get(key: string): Promise<string | undefined> {
    return this.provider.getSecret(key);
  }

  /**
   * Get a secret value or throw if not found
   */
  async getOrThrow(key: string): Promise<string> {
    const value = await this.provider.getSecret(key);
    if (!value) {
      throw new Error(`Required secret not found: ${key}`);
    }
    return value;
  }

  /**
   * Get a secret with a default value
   */
  async getOrDefault(key: string, defaultValue: string): Promise<string> {
    const value = await this.provider.getSecret(key);
    return value ?? defaultValue;
  }

  /**
   * Set a secret value (if supported by provider)
   */
  async set(key: string, value: string): Promise<void> {
    await this.provider.setSecret(key, value);
  }

  /**
   * Delete a secret (if supported by provider)
   */
  async delete(key: string): Promise<void> {
    await this.provider.deleteSecret(key);
  }
}

/**
 * Secrets Module Configuration
 */
import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [SecretsService],
  exports: [SecretsService],
})
export class SecretsModule {}
