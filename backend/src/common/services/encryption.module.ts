import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EncryptionService } from './encryption.service';

/**
 * Shared encryption module providing AES-256-GCM encryption service
 * Import wherever encryption is needed.
 *
 * Usage in module:
 * ```ts
 * import { EncryptionModule } from '../common/services';
 *
 * @Module({
 *   imports: [EncryptionModule],
 * })
 * ```
 */
@Module({
  imports: [ConfigModule], // For key loading
  providers: [EncryptionService],
  exports: [EncryptionService],
})
export class EncryptionModule {}
