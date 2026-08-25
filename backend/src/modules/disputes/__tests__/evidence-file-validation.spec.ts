import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { DisputesService } from '../disputes.service';
import { Dispute } from '../entities/dispute.entity';
import { DisputeEvidence } from '../entities/dispute-evidence.entity';
import { DisputeComment } from '../entities/dispute-comment.entity';
import { RentAgreement } from '../../rent/entities/rent-contract.entity';
import { User } from '../../users/entities/user.entity';
import { Payment as GeneralPayment } from '../../payments/entities/payment.entity';
import { Payment as RentPayment } from '../../rent/entities/payment.entity';
import { AuditService } from '../../audit/audit.service';
import { LockService } from '../../../common/lock';
import { IdempotencyService } from '../../../common/idempotency';
import { ValidationError } from '../../../common/errors/domain-errors';
import {
  DEFAULT_EVIDENCE_MAX_FILE_SIZE_BYTES,
  sniffEvidenceFileType,
  validateEvidenceFile,
} from '../utils/evidence-file-validation.util';

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function pngBuffer(extraBytes = 16): Buffer {
  return Buffer.from([...PNG_MAGIC, ...Array(extraBytes).fill(0x01)]);
}

describe('evidence file validation util', () => {
  describe('sniffEvidenceFileType', () => {
    it.each([
      ['image/jpeg', Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00])],
      ['image/png', pngBuffer()],
      ['image/gif', Buffer.from('GIF89a-rest-of-file')],
      ['image/gif', Buffer.from('GIF87a-rest-of-file')],
      ['application/pdf', Buffer.from('%PDF-1.7 rest')],
      [
        'application/msword',
        Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00]),
      ],
      [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]),
      ],
      ['text/plain', Buffer.from('Just a plain text statement.\n')],
    ])('detects %s by content', (expected, buffer) => {
      expect(sniffEvidenceFileType(buffer)).toBe(expected);
    });

    it.each([
      ['windows executable', Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03])],
      ['elf binary', Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01])],
      [
        'random binary',
        Buffer.from([0x00, 0x01, 0x02, 0x03, 0xde, 0xad, 0xbe, 0xef]),
      ],
      ['empty file', Buffer.alloc(0)],
    ])('rejects %s content', (_label, buffer) => {
      expect(sniffEvidenceFileType(buffer)).toBeNull();
    });
  });

  describe('validateEvidenceFile', () => {
    it('rejects a disallowed type even with an allowed declared MIME', () => {
      // An .exe uploaded with a forged image/png content type header.
      const file = {
        buffer: Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]),
        mimetype: 'image/png',
        size: 6,
      };
      const result = validateEvidenceFile(file);
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/invalid file type/i);
    });

    it('accepts an allowed type regardless of a bogus declared MIME', () => {
      const file = {
        buffer: pngBuffer(),
        mimetype: 'application/x-msdownload',
        size: 24,
      };
      const result = validateEvidenceFile(file);
      expect(result.isValid).toBe(true);
      expect(result.detectedType).toBe('image/png');
    });

    it('enforces the default size cap', () => {
      const file = {
        buffer: pngBuffer(),
        size: DEFAULT_EVIDENCE_MAX_FILE_SIZE_BYTES + 1,
      };
      const result = validateEvidenceFile(file);
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/size too large/i);
    });

    it('enforces a custom size cap', () => {
      const file = { buffer: pngBuffer(), size: 2_048 };
      expect(validateEvidenceFile(file, 1_024).isValid).toBe(false);
      expect(validateEvidenceFile(file, 4_096).isValid).toBe(true);
    });

    it('rejects files whose content is unavailable', () => {
      expect(validateEvidenceFile({ size: 10 }).isValid).toBe(false);
      expect(
        validateEvidenceFile({ buffer: Buffer.alloc(0), size: 0 }).isValid,
      ).toBe(false);
    });

    it('rejects text files containing NUL bytes', () => {
      const file = {
        buffer: Buffer.from('looks like text\x00but is binary'),
        size: 30,
      };
      expect(validateEvidenceFile(file).isValid).toBe(false);
    });
  });
});

describe('DisputesService evidence upload enforcement', () => {
  let service: DisputesService;
  let evidenceRepository: { create: jest.Mock; save: jest.Mock };
  let configGet: jest.Mock;

  const openDispute = { id: 1, disputeId: 'dispute-uuid-1' };

  async function buildService(): Promise<void> {
    evidenceRepository = {
      create: jest.fn().mockImplementation((data) => data),
      save: jest.fn().mockImplementation((data) => Promise.resolve(data)),
    };

    const emptyRepo = () => ({ findOne: jest.fn(), find: jest.fn() });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisputesService,
        { provide: getRepositoryToken(Dispute), useValue: emptyRepo() },
        {
          provide: getRepositoryToken(DisputeEvidence),
          useValue: evidenceRepository,
        },
        { provide: getRepositoryToken(DisputeComment), useValue: emptyRepo() },
        { provide: getRepositoryToken(RentAgreement), useValue: emptyRepo() },
        { provide: getRepositoryToken(User), useValue: emptyRepo() },
        { provide: getRepositoryToken(GeneralPayment), useValue: emptyRepo() },
        { provide: getRepositoryToken(RentPayment), useValue: emptyRepo() },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: DataSource, useValue: {} },
        {
          provide: LockService,
          useValue: {
            withLock: jest.fn(
              async (_k: string, _ttl: number, fn: () => Promise<unknown>) =>
                fn(),
            ),
          },
        },
        { provide: IdempotencyService, useValue: {} },
        { provide: ConfigService, useValue: { get: configGet } },
      ],
    }).compile();

    service = module.get(DisputesService);
    jest
      .spyOn(service, 'findByDisputeId')
      .mockResolvedValue(openDispute as never);
    jest
      .spyOn(
        service as never as { checkDisputePermission: () => unknown },
        'checkDisputePermission' as never,
      )
      .mockResolvedValue(undefined as never);
  }

  beforeEach(async () => {
    configGet = jest.fn((_key: string, defaultValue?: unknown) => defaultValue);
    await buildService();
  });

  it('stores the sniffed content type, not the declared MIME', async () => {
    const file = {
      originalname: 'evidence.png',
      mimetype: 'application/pdf', // forged declaration
      buffer: pngBuffer(),
      size: 24,
    };

    const evidence = await service.addEvidence('dispute-uuid-1', file, 'u-1');

    expect(evidence.fileType).toBe('image/png');
    expect(evidenceRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ fileType: 'image/png' }),
    );
  });

  it('rejects disallowed content regardless of declared MIME', async () => {
    const file = {
      originalname: 'evidence.pdf',
      mimetype: 'application/pdf',
      buffer: Buffer.from([0x4d, 0x5a, 0x90, 0x00]), // MZ executable
      size: 4,
    };

    await expect(
      service.addEvidence('dispute-uuid-1', file, 'u-1'),
    ).rejects.toThrow(ValidationError);
    expect(evidenceRepository.save).not.toHaveBeenCalled();
  });

  it('honours the configurable size cap', async () => {
    configGet = jest.fn((key: string, def?: unknown) =>
      key === 'DISPUTE_EVIDENCE_MAX_FILE_SIZE_BYTES' ? 1_024 : def,
    );
    await buildService();

    const file = {
      originalname: 'evidence.png',
      mimetype: 'image/png',
      buffer: pngBuffer(),
      size: 2_048,
    };

    await expect(
      service.addEvidence('dispute-uuid-1', file, 'u-1'),
    ).rejects.toThrow(/size too large/i);
  });

  it('rejects uploads with no readable content', async () => {
    const file = {
      originalname: 'evidence.pdf',
      mimetype: 'application/pdf',
      size: 512,
    };

    await expect(
      service.addEvidence('dispute-uuid-1', file, 'u-1'),
    ).rejects.toThrow(ValidationError);
  });
});
