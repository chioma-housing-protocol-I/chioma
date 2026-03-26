import { EncryptionService } from '../security/encryption.service';
import {
  prepareKycPayloadForStorage,
  tryDecryptStoredKycPayload,
  verifyEncryptedKycPayload,
} from './kyc-encryption.util';

export const KYC_MIGRATION_BACKUP_TABLE = 'kyc_migration_backups';
export const DEFAULT_KYC_MIGRATION_BATCH_SIZE = 100;

export interface KycMigrationSourceRow {
  id: string;
  encrypted_kyc_data: string | null;
  encryption_version: number | null;
}

export interface PreparedKycMigrationRow {
  kycId: string;
  originalValue: string;
  originalEncryptionVersion: number;
  originalFormat: 'plaintext' | 'encrypted';
  plaintextChecksum: string | null;
  migratedValue: string | null;
}

export function parseBatchSizeArg(
  rawBatchSize: string | undefined,
  fallback = DEFAULT_KYC_MIGRATION_BATCH_SIZE,
): number {
  const parsed = Number(rawBatchSize);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

export function prepareKycMigrationRow(
  row: KycMigrationSourceRow,
  encryptionService: EncryptionService,
): PreparedKycMigrationRow {
  if (!row.encrypted_kyc_data) {
    throw new Error(`KYC record ${row.id} has no payload to migrate`);
  }

  const alreadyEncrypted = tryDecryptStoredKycPayload(row.encrypted_kyc_data);
  if (alreadyEncrypted) {
    return {
      kycId: row.id,
      originalValue: row.encrypted_kyc_data,
      originalEncryptionVersion: row.encryption_version ?? 1,
      originalFormat: 'encrypted',
      plaintextChecksum: null,
      migratedValue: null,
    };
  }

  const preparedPayload = prepareKycPayloadForStorage(
    row.encrypted_kyc_data,
    encryptionService,
  );

  if (
    !verifyEncryptedKycPayload(
      preparedPayload.encryptedPayload,
      preparedPayload.checksum,
      encryptionService,
    )
  ) {
    throw new Error(`Integrity verification failed for KYC record ${row.id}`);
  }

  return {
    kycId: row.id,
    originalValue: row.encrypted_kyc_data,
    originalEncryptionVersion: row.encryption_version ?? 0,
    originalFormat: 'plaintext',
    plaintextChecksum: preparedPayload.checksum,
    migratedValue: preparedPayload.encryptedPayload,
  };
}
