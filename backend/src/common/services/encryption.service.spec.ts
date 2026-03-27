import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  EncryptionService,
  DecryptionFailedError,
  EncryptionError,
} from './encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;
  const mockConfigService = {
    get: jest.fn(),
  };

  const key1 = Buffer.from('01234567890123456789012345678901', 'utf8'); // 32 bytes
  const key2 = Buffer.from('abcdefghijklmnopqrstuvwxyz12345678', 'utf8'); // rotated key

  beforeEach(async () => {
    // Mock config for tests
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'ENCRYPTION_KEY_BASE64') {
        return key1.toString('base64');
      }
      return undefined;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('encrypt', () => {
    it('should encrypt plain text successfully', async () => {
      const plain = 'sensitive data';
      const encrypted = await service.encrypt(plain);

      expect(encrypted).toMatch(
        /^{"iv":"[^"]+","data":"[^"]+","tag":"[^"]+"}$/,
      );
      expect(JSON.parse(encrypted)).toHaveProperty('iv');
      expect(JSON.parse(encrypted)).toHaveProperty('data');
      expect(JSON.parse(encrypted)).toHaveProperty('tag');
    });

    it('should reject empty/invalid plain', async () => {
      await expect(service.encrypt('')).rejects.toThrow(EncryptionError);
      await expect(service.encrypt(null as any)).rejects.toThrow(
        EncryptionError,
      );
    });
  });

  describe('decrypt', () => {
    it('should decrypt correctly', async () => {
      const plain = 'secret message';
      const encrypted = await service.encrypt(plain);
      const decrypted = await service.decrypt(encrypted);

      expect(decrypted).toBe(plain);
    });

    it('should fail invalid ciphertext', async () => {
      await expect(service.decrypt('invalid')).rejects.toThrow(
        DecryptionFailedError,
      );
      await expect(service.decrypt('')).rejects.toThrow(EncryptionError);
    });

    it('should support key rotation', async () => {
      const plain = 'rotated data';
      // Patch keys for rotation test
      const oldKeys = service['keys'];
      service['keys'] = [key2, key1];

      // Encrypt with key1 (old)
      service['keys'] = [key1];
      const encWithKey1 = await service.encrypt(plain);
      service['keys'] = [key2, key1]; // rotation

      const decrypted = await service.decrypt(encWithKey1);
      expect(decrypted).toBe(plain);

      service['keys'] = oldKeys;
    });
  });

  describe('rotateKey', () => {
    it('should add new key to front', () => {
      const newKeyHex = 'fedcba9876543210fedcba9876543210';
      const newKey = Buffer.from(newKeyHex, 'hex');
      const newKeyB64 = newKey.toString('base64');
      service.rotateKey(newKeyB64);

      expect(service['keys'][0].toString('hex')).toBe(newKeyHex);
    });

    it('should reject invalid key length', () => {
      expect(() => service.rotateKey('short')).toThrow(EncryptionError);
    });
  });

  describe('getKeyCount', () => {
    it('should return current key count', () => {
      expect(service.getKeyCount()).toBe(1);
    });
  });
});
