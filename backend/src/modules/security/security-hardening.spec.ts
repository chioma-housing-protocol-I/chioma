import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';

import { EncryptionService } from './encryption.service';
import { RbacService } from './rbac.service';
import { ThreatDetectionService } from './threat-detection.service';
import { SecurityEventsService } from './security-events.service';
import { ComplianceService } from './compliance.service';
import { SecurityIncidentService } from './security-incident.service';

import {
  SecurityEvent,
  SecurityEventType,
  SecurityEventSeverity,
} from './entities/security-event.entity';
import {
  ThreatEvent,
  ThreatLevel,
  ThreatType,
  ThreatStatus,
} from './entities/threat-event.entity';
import { Role } from './entities/role.entity';
import {
  Permission,
  PermissionAction,
  PermissionResource,
} from './entities/permission.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';

// ──────────────────────────────────────────────────────────────────────────────
// Helper factory
// ──────────────────────────────────────────────────────────────────────────────

function mockRepo() {
  return {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      whereInIds: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(undefined),
    }),
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// EncryptionService
// ──────────────────────────────────────────────────────────────────────────────

describe('EncryptionService', () => {
  let service: EncryptionService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'SECURITY_ENCRYPTION_KEY') {
        return 'a'.repeat(64); // 64-char hex string → 256-bit key
      }
      return undefined;
    }),
  };

  beforeEach(async () => {
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

  describe('encrypt / decrypt', () => {
    it('should encrypt plain text to a non-readable cipher', () => {
      const plain = 'sensitive-data-123';
      const encrypted = service.encrypt(plain);
      expect(encrypted).not.toBe(plain);
      expect(encrypted.length).toBeGreaterThan(0);
    });

    it('should decrypt encrypted text back to original', () => {
      const plain = 'user@example.com';
      const encrypted = service.encrypt(plain);
      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(plain);
    });

    it('should produce different ciphertexts for the same plaintext (random IV/salt)', () => {
      const plain = 'same-text';
      const enc1 = service.encrypt(plain);
      const enc2 = service.encrypt(plain);
      expect(enc1).not.toBe(enc2);
      // But both should decrypt correctly
      expect(service.decrypt(enc1)).toBe(plain);
      expect(service.decrypt(enc2)).toBe(plain);
    });
  });

  describe('hash', () => {
    it('should produce a deterministic HMAC hash', () => {
      const h1 = service.hash('test@example.com');
      const h2 = service.hash('test@example.com');
      expect(h1).toBe(h2);
    });

    it('should be case-insensitive', () => {
      const lower = service.hash('test@example.com');
      const upper = service.hash('TEST@EXAMPLE.COM');
      expect(lower).toBe(upper);
    });

    it('should differ for different inputs', () => {
      const h1 = service.hash('alice@example.com');
      const h2 = service.hash('bob@example.com');
      expect(h1).not.toBe(h2);
    });
  });

  describe('generateSecureToken', () => {
    it('should generate tokens of the correct length', () => {
      const token = service.generateSecureToken(32);
      expect(token).toHaveLength(64); // 32 bytes → 64 hex chars
    });

    it('should generate unique tokens', () => {
      const t1 = service.generateSecureToken();
      const t2 = service.generateSecureToken();
      expect(t1).not.toBe(t2);
    });
  });

  describe('generateSignedToken / verifySignedToken', () => {
    it('should verify a valid signed token', () => {
      const token = service.generateSignedToken('user-123', 3600);
      expect(service.verifySignedToken(token, 'user-123')).toBe(true);
    });

    it('should reject a token with wrong payload', () => {
      const token = service.generateSignedToken('user-123', 3600);
      expect(service.verifySignedToken(token, 'user-456')).toBe(false);
    });

    it('should reject an expired token', () => {
      const token = service.generateSignedToken('user-123', -1); // already expired
      expect(service.verifySignedToken(token, 'user-123')).toBe(false);
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// RbacService
// ──────────────────────────────────────────────────────────────────────────────

describe('RbacService', () => {
  let service: RbacService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RbacService,
        { provide: getRepositoryToken(Role), useValue: mockRepo() },
        { provide: getRepositoryToken(Permission), useValue: mockRepo() },
      ],
    }).compile();

    service = module.get<RbacService>(RbacService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('admin should have READ permission on AUDIT', () => {
    expect(
      service.hasPermission(
        'admin',
        PermissionResource.AUDIT,
        PermissionAction.READ,
      ),
    ).toBe(true);
  });

  it('user should NOT have MANAGE permission on ADMIN', () => {
    expect(
      service.hasPermission(
        'user',
        PermissionResource.ADMIN,
        PermissionAction.MANAGE,
      ),
    ).toBe(false);
  });

  it('super_admin should have MANAGE on all resources', () => {
    for (const resource of Object.values(PermissionResource)) {
      expect(
        service.hasPermission(
          'super_admin',
          resource as PermissionResource,
          PermissionAction.MANAGE,
        ),
      ).toBe(true);
    }
  });

  it('landlord should be able to create properties', () => {
    expect(
      service.hasPermission(
        'landlord',
        PermissionResource.PROPERTIES,
        PermissionAction.CREATE,
      ),
    ).toBe(true);
  });

  it('tenant should NOT be able to delete properties', () => {
    expect(
      service.hasPermission(
        'tenant',
        PermissionResource.PROPERTIES,
        PermissionAction.DELETE,
      ),
    ).toBe(false);
  });

  it('auditor should only read, not create, financial records', () => {
    expect(
      service.hasPermission(
        'auditor',
        PermissionResource.PAYMENTS,
        PermissionAction.READ,
      ),
    ).toBe(true);
    expect(
      service.hasPermission(
        'auditor',
        PermissionResource.PAYMENTS,
        PermissionAction.CREATE,
      ),
    ).toBe(false);
  });

  it('assertPermission should throw ForbiddenException for denied access', () => {
    expect(() =>
      service.assertPermission(
        'tenant',
        PermissionResource.SECURITY,
        PermissionAction.MANAGE,
      ),
    ).toThrow();
  });

  it('assertPermission should not throw for allowed access', () => {
    expect(() =>
      service.assertPermission(
        'admin',
        PermissionResource.AUDIT,
        PermissionAction.READ,
      ),
    ).not.toThrow();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// ThreatDetectionService
// ──────────────────────────────────────────────────────────────────────────────

describe('ThreatDetectionService', () => {
  let service: ThreatDetectionService;
  let threatRepo: jest.Mocked<Partial<Repository<ThreatEvent>>>;
  let securityEventsService: jest.Mocked<SecurityEventsService>;

  beforeEach(async () => {
    threatRepo = mockRepo() as any;
    threatRepo.save = jest.fn().mockResolvedValue({ id: 'threat-1' });
    threatRepo.find = jest.fn().mockResolvedValue([]);
    threatRepo.count = jest.fn().mockResolvedValue(0);
    threatRepo.update = jest.fn().mockResolvedValue(undefined);

    const mockSecurityEventsService = {
      createEvent: jest.fn().mockResolvedValue({}),
      getFailedLoginAttempts: jest.fn().mockResolvedValue(0),
      getUserEvents: jest.fn().mockResolvedValue([]),
      detectSuspiciousActivity: jest.fn().mockResolvedValue(false),
      getRecentEvents: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThreatDetectionService,
        { provide: getRepositoryToken(ThreatEvent), useValue: threatRepo },
        { provide: SecurityEventsService, useValue: mockSecurityEventsService },
      ],
    }).compile();

    service = module.get<ThreatDetectionService>(ThreatDetectionService);
    securityEventsService = module.get(SecurityEventsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should allow a clean request', async () => {
    const mockReq = {
      headers: {},
      path: '/api/v1/properties',
      method: 'GET',
      body: {},
      socket: { remoteAddress: '192.168.1.1' },
    } as any;

    const result = await service.analyzeRequest(mockReq, 'user-1');
    expect(result).toBe('allow');
  });

  it('should detect brute-force when failed logins exceed threshold', async () => {
    (
      securityEventsService.getFailedLoginAttempts as jest.Mock
    ).mockResolvedValue(15);
    threatRepo.save = jest.fn().mockResolvedValue({ id: 'threat-2' });

    const detected = await service.checkBruteForce('10.0.0.1', 'user-1');
    expect(detected).toBe(true);
    expect(securityEventsService.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
        severity: SecurityEventSeverity.CRITICAL,
      }),
    );
  });

  it('should not flag brute force below threshold', async () => {
    (
      securityEventsService.getFailedLoginAttempts as jest.Mock
    ).mockResolvedValue(3);
    const detected = await service.checkBruteForce('10.0.0.2', 'user-2');
    expect(detected).toBe(false);
  });

  it('should detect privilege escalation across multiple levels', async () => {
    threatRepo.save = jest.fn().mockResolvedValue({ id: 'threat-3' });
    await service.detectPrivilegeEscalation('user-1', 'super_admin', 'user');
    expect(threatRepo.save).toHaveBeenCalled();
  });

  it('should not flag single-level role promotion', async () => {
    threatRepo.save = jest.fn().mockResolvedValue({ id: 'threat-4' });
    await service.detectPrivilegeEscalation('user-1', 'tenant', 'user');
    expect(threatRepo.save).not.toHaveBeenCalled();
  });

  it('should flag large data access as potential exfiltration', async () => {
    threatRepo.save = jest.fn().mockResolvedValue({ id: 'threat-5' });
    await service.detectDataExfiltration('user-1', 2000);
    expect(threatRepo.save).toHaveBeenCalled();
  });

  it('should mark a threat as false positive', async () => {
    await service.markFalsePositive('threat-1');
    expect(threatRepo.update).toHaveBeenCalledWith('threat-1', {
      status: ThreatStatus.FALSE_POSITIVE,
    });
  });

  it('should return threat stats', async () => {
    threatRepo.find = jest.fn().mockResolvedValue([
      {
        threatLevel: ThreatLevel.CRITICAL,
        blocked: true,
        autoMitigated: true,
        threatType: ThreatType.BRUTE_FORCE,
      },
      {
        threatLevel: ThreatLevel.HIGH,
        blocked: false,
        autoMitigated: false,
        threatType: ThreatType.SQL_INJECTION,
      },
    ]);

    const stats = await service.getThreatStats(24);
    expect(stats.total).toBe(2);
    expect(stats.byCritical).toBe(1);
    expect(stats.byHigh).toBe(1);
    expect(stats.blocked).toBe(1);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// SecurityIncidentService
// ──────────────────────────────────────────────────────────────────────────────

describe('SecurityIncidentService', () => {
  let service: SecurityIncidentService;
  let threatRepo: jest.Mocked<Partial<Repository<ThreatEvent>>>;

  beforeEach(async () => {
    threatRepo = mockRepo() as any;
    threatRepo.update = jest.fn().mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityIncidentService,
        { provide: getRepositoryToken(ThreatEvent), useValue: threatRepo },
        { provide: getRepositoryToken(SecurityEvent), useValue: mockRepo() },
      ],
    }).compile();

    service = module.get<SecurityIncidentService>(SecurityIncidentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a P1 incident for a critical threat', async () => {
    const threat = {
      id: 'threat-1',
      threatType: ThreatType.BRUTE_FORCE,
      threatLevel: ThreatLevel.CRITICAL,
      ipAddress: '1.2.3.4',
      userId: 'user-1',
      description: 'Brute force detected',
      createdAt: new Date(),
    } as ThreatEvent;

    const incident = await service.triageThreat(threat);
    expect(incident).toBeDefined();
    expect(incident.severity).toBe('P1');
    expect(incident.affectedUsers).toContain('user-1');
    expect(incident.responseActions.length).toBeGreaterThan(0);
  });

  it('should group repeated threats from the same IP into one incident', async () => {
    const now = new Date();
    const threat1 = {
      id: 't1',
      threatType: ThreatType.BRUTE_FORCE,
      threatLevel: ThreatLevel.HIGH,
      ipAddress: '5.6.7.8',
      userId: 'user-2',
      description: 'Attempt 1',
      createdAt: now,
    } as ThreatEvent;
    const threat2 = {
      id: 't2',
      threatType: ThreatType.BRUTE_FORCE,
      threatLevel: ThreatLevel.HIGH,
      ipAddress: '5.6.7.8',
      userId: 'user-3',
      description: 'Attempt 2',
      createdAt: now,
    } as ThreatEvent;

    const inc1 = await service.triageThreat(threat1);
    const inc2 = await service.triageThreat(threat2);
    expect(inc1.id).toBe(inc2.id);
    expect(inc2.affectedUsers.length).toBe(2);
  });

  it('should resolve an incident', async () => {
    const threat = {
      id: 'threat-10',
      threatType: ThreatType.XSS_ATTEMPT,
      threatLevel: ThreatLevel.HIGH,
      ipAddress: '9.9.9.9',
      userId: null,
      description: 'XSS attempt',
      createdAt: new Date(),
    } as ThreatEvent;

    const incident = await service.triageThreat(threat);
    const resolved = service.resolveIncident(
      incident.id,
      'Patched input validation',
    );
    expect(resolved?.status).toBe('resolved');
    expect(resolved?.resolvedAt).toBeDefined();
  });

  it('should generate an incident report', async () => {
    const threat = {
      id: 'threat-20',
      threatType: ThreatType.SQL_INJECTION,
      threatLevel: ThreatLevel.CRITICAL,
      ipAddress: '10.20.30.40',
      userId: 'user-4',
      description: 'SQLi detected',
      createdAt: new Date(),
    } as ThreatEvent;

    const incident = await service.triageThreat(threat);
    service.resolveIncident(incident.id, 'WAF rule added');
    const report = service.generateIncidentReport(incident.id);
    expect(report).not.toBeNull();
    expect(report?.totalThreats).toBeGreaterThan(0);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// ComplianceService
// ──────────────────────────────────────────────────────────────────────────────

describe('ComplianceService', () => {
  let service: ComplianceService;

  beforeEach(async () => {
    const auditRepo = mockRepo();
    const secEventRepo = mockRepo();
    const threatRepo = mockRepo();

    auditRepo.count.mockResolvedValue(500);
    secEventRepo.count.mockResolvedValue(0);
    threatRepo.count.mockResolvedValue(2);

    process.env.SECURITY_ENCRYPTION_KEY = 'a'.repeat(64);
    process.env.NODE_ENV = 'test';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplianceService,
        { provide: getRepositoryToken(AuditLog), useValue: auditRepo },
        { provide: getRepositoryToken(SecurityEvent), useValue: secEventRepo },
        { provide: getRepositoryToken(ThreatEvent), useValue: threatRepo },
      ],
    }).compile();

    service = module.get<ComplianceService>(ComplianceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate a GDPR report with a passing score', async () => {
    const to = new Date();
    const from = new Date(to.getTime() - 30 * 24 * 3600 * 1000);
    const report = await service.generateGdprReport(from, to);

    expect(report.framework).toBe('GDPR');
    expect(report.score).toBeGreaterThan(50);
    expect(report.findings.length).toBeGreaterThan(0);
    expect(['compliant', 'partial', 'non_compliant']).toContain(report.status);
  });

  it('should generate a SOC2 report', async () => {
    const to = new Date();
    const from = new Date(to.getTime() - 30 * 24 * 3600 * 1000);
    const report = await service.generateSoc2Report(from, to);

    expect(report.framework).toBe('SOC2');
    expect(report.findings.length).toBeGreaterThan(0);
  });

  it('should generate a PCI-DSS report', async () => {
    const to = new Date();
    const from = new Date(to.getTime() - 30 * 24 * 3600 * 1000);
    const report = await service.generatePciDssReport(from, to);

    expect(report.framework).toBe('PCI-DSS');
    expect(report.findings.length).toBeGreaterThan(0);
  });

  it('should return a security score with grade', async () => {
    const result = await service.getSecurityScore();
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(['A', 'B', 'C', 'D']).toContain(result.grade);
    expect(result.areas).toHaveProperty('authentication');
    expect(result.areas).toHaveProperty('encryption');
  });
});
