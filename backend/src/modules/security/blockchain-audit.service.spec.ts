import { Repository } from 'typeorm';
import { AuditLog } from '../audit/entities/audit-log.entity';
import {
  BlockchainAuditService,
  StellarTransactionHashMissingError,
} from './blockchain-audit.service';

describe('BlockchainAuditService', () => {
  let service: BlockchainAuditService;

  beforeEach(() => {
    service = new BlockchainAuditService({} as Repository<AuditLog>);
  });

  describe('validateTransactionHash', () => {
    it('accepts a valid transaction hash string', () => {
      expect((service as any).validateTransactionHash('abc123def456')).toBe(
        'abc123def456',
      );
    });

    it('throws a specific error when the transaction hash is undefined', () => {
      expect(() => (service as any).validateTransactionHash(undefined)).toThrow(
        StellarTransactionHashMissingError,
      );
      expect(() => (service as any).validateTransactionHash(undefined)).toThrow(
        'Stellar transaction hash missing',
      );
    });

    it('throws a specific error when the transaction hash is an empty string', () => {
      expect(() => (service as any).validateTransactionHash('')).toThrow(
        StellarTransactionHashMissingError,
      );
      expect(() => (service as any).validateTransactionHash('   ')).toThrow(
        'Stellar transaction hash missing',
      );
    });

    it('throws a specific error when the transaction hash is not a string', () => {
      expect(() => (service as any).validateTransactionHash(42)).toThrow(
        StellarTransactionHashMissingError,
      );
      expect(() => (service as any).validateTransactionHash({})).toThrow(
        'Stellar transaction hash missing',
      );
    });
  });
});
