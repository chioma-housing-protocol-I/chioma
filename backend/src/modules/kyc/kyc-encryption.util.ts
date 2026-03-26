import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { EncryptionService } from '../security/encryption.service';
import { EncryptionTransformer } from '../security/transformers/encryption.transformer';

export const KYC_SENSITIVE_FIELDS = [
  'first_name',
  'last_name',
  'date_of_birth',
  'address',
  'city',
  'state',
  'postal_code',
  'country',
  'id_number',
  'tax_id',
  'phone_number',
  'bank_account_number',
  'bank_routing_number',
] as const;

export type KycDataPayload = Record<string, unknown>;

function isRecord(value: unknown): value is KycDataPayload {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

export function parseKycPayload(value: unknown): KycDataPayload {
  if (isRecord(value)) {
    return { ...value };
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = JSON.parse(value) as unknown;
    if (isRecord(parsed)) {
      return parsed;
    }
  }

  throw new Error('KYC payload is not a valid JSON object');
}

export function createEncryptionServiceFromEnv(): EncryptionService {
  const configService = {
    get<T = string>(key: string): T | undefined {
      return process.env[key] as T | undefined;
    },
  } as ConfigService;

  return new EncryptionService(configService);
}

export function encryptSensitiveKycFields(
  data: KycDataPayload,
  encryptionService: EncryptionService,
): KycDataPayload {
  const encryptedData: KycDataPayload = { ...data };

  for (const field of KYC_SENSITIVE_FIELDS) {
    const currentValue = encryptedData[field];
    if (currentValue !== null && currentValue !== undefined && currentValue !== '') {
      encryptedData[field] = encryptionService.encrypt(
        normalizeString(currentValue),
      );
    }
  }

  return encryptedData;
}

export function decryptSensitiveKycFields(
  data: KycDataPayload,
  encryptionService: EncryptionService,
): KycDataPayload {
  const decryptedData: KycDataPayload = { ...data };

  for (const field of KYC_SENSITIVE_FIELDS) {
    const currentValue = decryptedData[field];
    if (typeof currentValue !== 'string' || !currentValue) {
      continue;
    }

    try {
      decryptedData[field] = encryptionService.decrypt(currentValue);
    } catch {
      decryptedData[field] = currentValue;
    }
  }

  return decryptedData;
}

export function serializeEncryptedKycPayload(data: KycDataPayload): string {
  const encrypted = EncryptionTransformer.to(data);
  if (!encrypted) {
    throw new Error('Failed to serialize encrypted KYC payload');
  }
  return encrypted;
}

export function tryDecryptStoredKycPayload(
  encryptedValue: string,
): KycDataPayload | null {
  try {
    const decrypted = EncryptionTransformer.from(encryptedValue);
    return isRecord(decrypted) ? decrypted : null;
  } catch {
    return null;
  }
}

export function hashKycPayload(data: KycDataPayload): string {
  return crypto.createHash('sha256').update(stableStringify(data)).digest('hex');
}

export function prepareKycPayloadForStorage(
  legacyValue: unknown,
  encryptionService: EncryptionService,
): {
  plaintextPayload: KycDataPayload;
  encryptedPayload: string;
  checksum: string;
} {
  const plaintextPayload = parseKycPayload(legacyValue);
  const encryptedFieldsPayload = encryptSensitiveKycFields(
    plaintextPayload,
    encryptionService,
  );
  const encryptedPayload = serializeEncryptedKycPayload(encryptedFieldsPayload);
  const checksum = hashKycPayload(plaintextPayload);

  return {
    plaintextPayload,
    encryptedPayload,
    checksum,
  };
}

export function verifyEncryptedKycPayload(
  encryptedPayload: string,
  expectedChecksum: string,
  encryptionService: EncryptionService,
): boolean {
  const decryptedOuterPayload = tryDecryptStoredKycPayload(encryptedPayload);
  if (!decryptedOuterPayload) {
    return false;
  }

  const decryptedPayload = decryptSensitiveKycFields(
    decryptedOuterPayload,
    encryptionService,
  );

  return hashKycPayload(decryptedPayload) === expectedChecksum;
}
