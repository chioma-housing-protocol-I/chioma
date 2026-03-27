import { EncryptionService } from './encryption.service';
import { ConfigService } from '@nestjs/config';

describe('EncryptionService', () => {
  let service: EncryptionService;
  let configService: ConfigService;

  beforeEach(() => {
    configService = {
      get: (key: string) => {
        if (key === 'SECURITY_ENCRYPTION_KEYS') {
          // 2 keys for rotation test (64 hex chars each)
          return '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef,abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';
        }
        return undefined;
      },
    } as any;
    service = new EncryptionService(configService);
  });

  it('should encrypt and decrypt data with the current key', () => {
    const plaintext = 'Sensitive KYC Data';
    const encrypted = service.encrypt(plaintext);
    expect(typeof encrypted).toBe('string');
    const decrypted = service.decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('should decrypt data encrypted with a previous key', () => {
    // Simulate encryption with the second key
    (service as any).currentKey = (service as any).keys[1];
    const plaintext = 'Legacy KYC Data';
    const encrypted = service.encrypt(plaintext);
    // Restore current key to first
    (service as any).currentKey = (service as any).keys[0];
    const decrypted = service.decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('should throw on decryption with invalid data', () => {
    expect(() => service.decrypt('invalid')).toThrow();
  });
});
