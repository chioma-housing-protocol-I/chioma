import {
  createEncryptionServiceFromEnv,
  prepareKycPayloadForStorage,
  verifyEncryptedKycPayload,
} from './kyc-encryption.util';
import {
  parseBatchSizeArg,
  prepareKycMigrationRow,
} from './kyc-data-migration.util';

describe('kyc-data-migration.util', () => {
  const originalKey = process.env.SECURITY_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.SECURITY_ENCRYPTION_KEY =
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  });

  afterAll(() => {
    process.env.SECURITY_ENCRYPTION_KEY = originalKey;
  });

  it('prepares a legacy plaintext KYC row for migration', () => {
    const encryptionService = createEncryptionServiceFromEnv();
    const row = prepareKycMigrationRow(
      {
        id: 'kyc-plain-1',
        encrypted_kyc_data: JSON.stringify({
          first_name: 'Ada',
          last_name: 'Lovelace',
          country: 'NG',
        }),
        encryption_version: 0,
      },
      encryptionService,
    );

    expect(row.originalFormat).toBe('plaintext');
    expect(row.migratedValue).toEqual(expect.any(String));
    expect(row.plaintextChecksum).toEqual(expect.any(String));
    expect(
      verifyEncryptedKycPayload(
        row.migratedValue!,
        row.plaintextChecksum!,
        encryptionService,
      ),
    ).toBe(true);
  });

  it('skips a row that is already encrypted', () => {
    const encryptionService = createEncryptionServiceFromEnv();
    const prepared = prepareKycPayloadForStorage(
      {
        first_name: 'Grace',
        last_name: 'Hopper',
      },
      encryptionService,
    );

    const row = prepareKycMigrationRow(
      {
        id: 'kyc-encrypted-1',
        encrypted_kyc_data: prepared.encryptedPayload,
        encryption_version: 1,
      },
      encryptionService,
    );

    expect(row.originalFormat).toBe('encrypted');
    expect(row.migratedValue).toBeNull();
    expect(row.plaintextChecksum).toBeNull();
  });

  it('parses a valid batch size and falls back for invalid values', () => {
    expect(parseBatchSizeArg('250')).toBe(250);
    expect(parseBatchSizeArg('0')).toBe(100);
    expect(parseBatchSizeArg('abc')).toBe(100);
  });
});
