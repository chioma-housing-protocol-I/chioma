import 'reflect-metadata';
import { AppDataSource } from '../src/database/data-source';
import {
  createEncryptionServiceFromEnv,
  tryDecryptStoredKycPayload,
  verifyEncryptedKycPayload,
} from '../src/modules/kyc/kyc-encryption.util';
import {
  DEFAULT_KYC_MIGRATION_BATCH_SIZE,
  KYC_MIGRATION_BACKUP_TABLE,
  KycMigrationSourceRow,
  parseBatchSizeArg,
  prepareKycMigrationRow,
} from '../src/modules/kyc/kyc-data-migration.util';

type MigrationCommand = 'migrate' | 'verify' | 'rollback';

interface CliOptions {
  batchSize: number;
}

function logProgress(message: string): void {
  console.log(`[kyc-migration] ${message}`);
}

function parseCliOptions(argv: string[]): CliOptions {
  const batchSizeArg = argv.find((arg) => arg.startsWith('--batch-size='));
  const rawBatchSize = batchSizeArg?.split('=')[1];

  return {
    batchSize: parseBatchSizeArg(rawBatchSize, DEFAULT_KYC_MIGRATION_BATCH_SIZE),
  };
}

async function ensureBackupTable(): Promise<void> {
  await AppDataSource.query(`
    CREATE TABLE IF NOT EXISTS "${KYC_MIGRATION_BACKUP_TABLE}" (
      "kyc_id" uuid PRIMARY KEY,
      "original_encrypted_kyc_data" text NOT NULL,
      "original_encryption_version" integer NOT NULL DEFAULT 0,
      "original_format" varchar(20) NOT NULL,
      "plaintext_checksum" varchar(64),
      "migrated_at" timestamptz NOT NULL DEFAULT now(),
      "rolled_back_at" timestamptz
    )
  `);
}

async function migrateBatch(batchSize: number): Promise<{
  migrated: number;
  skipped: number;
}> {
  const queryRunner = AppDataSource.createQueryRunner();
  const encryptionService = createEncryptionServiceFromEnv();

  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const rows = await queryRunner.query(
      `
        SELECT k.id, k.encrypted_kyc_data, k.encryption_version
        FROM kyc k
        WHERE NOT EXISTS (
          SELECT 1
          FROM "${KYC_MIGRATION_BACKUP_TABLE}" backup
          WHERE backup.kyc_id = k.id
        )
        ORDER BY k.created_at ASC, k.id ASC
        LIMIT $1
        FOR UPDATE SKIP LOCKED
      `,
      [batchSize],
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      await queryRunner.commitTransaction();
      return { migrated: 0, skipped: 0 };
    }

    let migrated = 0;
    let skipped = 0;

    for (const row of rows as KycMigrationSourceRow[]) {
      const prepared = prepareKycMigrationRow(row, encryptionService);

      await queryRunner.query(
        `
          INSERT INTO "${KYC_MIGRATION_BACKUP_TABLE}" (
            "kyc_id",
            "original_encrypted_kyc_data",
            "original_encryption_version",
            "original_format",
            "plaintext_checksum"
          ) VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT ("kyc_id") DO NOTHING
        `,
        [
          prepared.kycId,
          prepared.originalValue,
          prepared.originalEncryptionVersion,
          prepared.originalFormat,
          prepared.plaintextChecksum,
        ],
      );

      if (prepared.originalFormat === 'encrypted') {
        skipped += 1;
        continue;
      }

      await queryRunner.query(
        `
          UPDATE kyc
          SET encrypted_kyc_data = $2,
              encryption_version = 1,
              updated_at = now()
          WHERE id = $1
        `,
        [prepared.kycId, prepared.migratedValue],
      );

      migrated += 1;
    }

    await queryRunner.commitTransaction();
    return { migrated, skipped };
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}

async function runMigration(batchSize: number): Promise<void> {
  await ensureBackupTable();

  let totalMigrated = 0;
  let totalSkipped = 0;
  let batchNumber = 0;

  while (true) {
    batchNumber += 1;
    const result = await migrateBatch(batchSize);

    if (result.migrated === 0 && result.skipped === 0) {
      logProgress(
        `Migration complete. migrated=${totalMigrated}, skipped=${totalSkipped}`,
      );
      return;
    }

    totalMigrated += result.migrated;
    totalSkipped += result.skipped;
    logProgress(
      `Batch ${batchNumber}: migrated=${result.migrated}, skipped=${result.skipped}, totalMigrated=${totalMigrated}, totalSkipped=${totalSkipped}`,
    );
  }
}

async function verifyMigration(batchSize: number): Promise<void> {
  await ensureBackupTable();

  const encryptionService = createEncryptionServiceFromEnv();
  let offset = 0;
  let verified = 0;

  while (true) {
    const rows = await AppDataSource.query(
      `
        SELECT
          k.id,
          k.encrypted_kyc_data,
          backup.original_format,
          backup.plaintext_checksum,
          backup.original_encrypted_kyc_data,
          backup.rolled_back_at
        FROM "${KYC_MIGRATION_BACKUP_TABLE}" backup
        INNER JOIN kyc k ON k.id = backup.kyc_id
        ORDER BY backup.migrated_at ASC, backup.kyc_id ASC
        LIMIT $1 OFFSET $2
      `,
      [batchSize, offset],
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      logProgress(`Verification complete. verified=${verified}`);
      return;
    }

    for (const row of rows as Array<{
      id: string;
      encrypted_kyc_data: string | null;
      original_format: 'plaintext' | 'encrypted';
      plaintext_checksum: string | null;
      original_encrypted_kyc_data: string;
      rolled_back_at: string | null;
    }>) {
      if (!row.encrypted_kyc_data) {
        throw new Error(`KYC record ${row.id} has no stored payload`);
      }

      if (row.rolled_back_at) {
        if (row.encrypted_kyc_data !== row.original_encrypted_kyc_data) {
          throw new Error(`Rollback verification failed for KYC record ${row.id}`);
        }
        verified += 1;
        continue;
      }

      if (row.original_format === 'encrypted') {
        if (!tryDecryptStoredKycPayload(row.encrypted_kyc_data)) {
          throw new Error(`Encrypted KYC payload could not be decrypted for ${row.id}`);
        }
        verified += 1;
        continue;
      }

      if (!row.plaintext_checksum) {
        throw new Error(`Missing plaintext checksum for migrated KYC record ${row.id}`);
      }

      if (
        !verifyEncryptedKycPayload(
          row.encrypted_kyc_data,
          row.plaintext_checksum,
          encryptionService,
        )
      ) {
        throw new Error(`Checksum verification failed for KYC record ${row.id}`);
      }

      verified += 1;
    }

    offset += rows.length;
    logProgress(`Verified ${verified} KYC record(s) so far`);
  }
}

async function rollbackMigration(batchSize: number): Promise<void> {
  await ensureBackupTable();

  let batchNumber = 0;
  let restored = 0;

  while (true) {
    const rows = await AppDataSource.query(
      `
        SELECT
          kyc_id,
          original_encrypted_kyc_data,
          original_encryption_version
        FROM "${KYC_MIGRATION_BACKUP_TABLE}"
        WHERE original_format = 'plaintext'
          AND rolled_back_at IS NULL
        ORDER BY migrated_at DESC, kyc_id DESC
        LIMIT $1
      `,
      [batchSize],
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      logProgress(`Rollback complete. restored=${restored}`);
      return;
    }

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const row of rows as Array<{
        kyc_id: string;
        original_encrypted_kyc_data: string;
        original_encryption_version: number;
      }>) {
        await queryRunner.query(
          `
            UPDATE kyc
            SET encrypted_kyc_data = $2,
                encryption_version = $3,
                updated_at = now()
            WHERE id = $1
          `,
          [
            row.kyc_id,
            row.original_encrypted_kyc_data,
            row.original_encryption_version,
          ],
        );

        await queryRunner.query(
          `
            UPDATE "${KYC_MIGRATION_BACKUP_TABLE}"
            SET rolled_back_at = now()
            WHERE kyc_id = $1
          `,
          [row.kyc_id],
        );

        restored += 1;
      }

      await queryRunner.commitTransaction();
      batchNumber += 1;
      logProgress(
        `Rollback batch ${batchNumber}: restored=${rows.length}, totalRestored=${restored}`,
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}

async function main(): Promise<void> {
  const command = (process.argv[2] || 'migrate') as MigrationCommand;
  const options = parseCliOptions(process.argv.slice(3));

  await AppDataSource.initialize();

  try {
    if (command === 'migrate') {
      await runMigration(options.batchSize);
      return;
    }

    if (command === 'verify') {
      await verifyMigration(options.batchSize);
      return;
    }

    if (command === 'rollback') {
      await rollbackMigration(options.batchSize);
      return;
    }

    throw new Error(
      'Usage: ts-node scripts/kyc-data-migration.ts migrate|verify|rollback [--batch-size=100]',
    );
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

if (require.main === module) {
  void main().catch((error) => {
    console.error('[kyc-migration] Failed:', error);
    process.exit(1);
  });
}
