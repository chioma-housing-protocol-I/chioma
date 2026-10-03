import { Repository } from 'typeorm';
import { AuditLog } from '../audit/entities/audit-log.entity';
import {
  BlockchainAuditService,
  StellarTransactionHashInvalidError,
  StellarTransactionHashMissingError,
} from './blockchain-audit.service';

const VALID_HASH = 'a'.repeat(64);

describe('BlockchainAuditService', () => {
  let service: BlockchainAuditService;

  beforeEach(() => {
    service = new BlockchainAuditService({} as Repository<AuditLog>);
  });

  describe('validateTransactionHash', () => {
    it('accepts a valid 64-character hex transaction hash', () => {
      expect((service as any).validateTransactionHash(VALID_HASH)).toBe(
        VALID_HASH,
      );
    });

    it('normalises an uppercase hex hash to lowercase', () => {
      expect(
        (service as any).validateTransactionHash(VALID_HASH.toUpperCase()),
      ).toBe(VALID_HASH);
    });

    it.each([
      ['too short', 'abc123def456'],
      ['too long', 'a'.repeat(65)],
      ['non-hex characters', 'z'.repeat(64)],
      ['surrounding whitespace', ` ${VALID_HASH} `],
    ])('rejects a malformed hash (%s)', (_, hash) => {
      expect(() => (service as any).validateTransactionHash(hash)).toThrow(
        StellarTransactionHashInvalidError,
      );
    });

    it('throws a specific error when the transaction hash is null', () => {
      expect(() => (service as any).validateTransactionHash(null)).toThrow(
        StellarTransactionHashMissingError,
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

  describe('extractTransactionHash', () => {
    it('returns the hash from a well-formed Stellar response', () => {
      expect(
        (service as any).extractTransactionHash({ hash: VALID_HASH, ledger: 1 }),
      ).toBe(VALID_HASH);
    });

    it.each([
      ['undefined', undefined],
      ['null', null],
      ['a string', 'not-a-response'],
    ])('throws a specific error when the response is %s', (_, response) => {
      expect(() => (service as any).extractTransactionHash(response)).toThrow(
        StellarTransactionHashMissingError,
      );
    });

    it('throws a specific error when the response has no hash field', () => {
      expect(() =>
        (service as any).extractTransactionHash({ successful: true }),
      ).toThrow('Stellar transaction hash missing');
    });
  });

  describe('anchorAuditBatch', () => {
    const logs = [
      {
        id: 'log-1',
        action: 'LOGIN',
        entity_type: 'user',
        entity_id: 'user-1',
        performed_by: 'user-1',
        performed_at: new Date('2026-01-01T00:00:00Z'),
        status: 'SUCCESS',
      },
    ] as unknown as AuditLog[];

    beforeEach(() => {
      jest.spyOn(service as any, 'getUnanchoredLogs').mockResolvedValue(logs);
      jest.spyOn(service as any, 'markLogsAnchored').mockResolvedValue(undefined);
    });

    it('records the tx hash when Stellar returns a valid hash', async () => {
      jest.spyOn(service as any, 'submitToStellar').mockResolvedValue(VALID_HASH);

      const record = await service.anchorAuditBatch();

      expect(record?.txHash).toBe(VALID_HASH);
    });

    it.each([
      ['missing', new StellarTransactionHashMissingError()],
      ['malformed', new StellarTransactionHashInvalidError()],
    ])(
      'does not crash and keeps the Merkle root locally when the hash is %s',
      async (_, error) => {
        jest.spyOn(service as any, 'submitToStellar').mockRejectedValue(error);

        const record = await service.anchorAuditBatch();

        expect(record).not.toBeNull();
        expect(record?.txHash).toBeNull();
        expect(record?.merkleRoot).toMatch(/^[a-f0-9]{64}$/);
        expect((service as any).markLogsAnchored).toHaveBeenCalledWith(
          logs,
          record,
        );
      },
    );
  });
});
