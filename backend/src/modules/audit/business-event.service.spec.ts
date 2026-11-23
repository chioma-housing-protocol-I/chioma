import { BusinessEventService } from './business-event.service';
import {
  AuditAction,
  AuditLevel,
  AuditStatus,
} from './entities/audit-log.entity';

describe('business event audit trail (#2188)', () => {
  const setup = () => {
    const audit = {
      log: jest.fn().mockResolvedValue(undefined),
      query: jest.fn().mockResolvedValue({ data: [], total: 0 }),
    };
    return { service: new BusinessEventService(audit as never), audit };
  };

  it('records a state change with actor, resource, before and after values', async () => {
    const { service, audit } = setup();

    await service.recordStateChange({
      action: AuditAction.UPDATE,
      actorId: 'user-1',
      resourceType: 'Property',
      resourceId: 'property-1',
      before: { status: 'DRAFT' },
      after: { status: 'PUBLISHED' },
      reason: 'owner published listing',
    });

    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditAction.UPDATE,
        entityType: 'Property',
        entityId: 'property-1',
        performedBy: 'user-1',
        oldValues: { status: 'DRAFT' },
        newValues: { status: 'PUBLISHED' },
        status: AuditStatus.SUCCESS,
        level: AuditLevel.INFO,
        metadata: expect.objectContaining({
          businessEvent: true,
          reason: 'owner published listing',
        }),
      }),
    );
  });

  it('stamps an immutable timestamp instead of trusting the caller', async () => {
    const { service, audit } = setup();
    const before = Date.now();

    await service.recordStateChange({
      action: AuditAction.CREATE,
      actorId: 'user-2',
      resourceType: 'Agreement',
      resourceId: 'agreement-1',
    });

    const logged = audit.log.mock.calls[0][0];
    expect(logged.metadata.occurredAt).toBeGreaterThanOrEqual(before);
    expect(logged.metadata.occurredAt).toBeLessThanOrEqual(Date.now());
    expect(logged.metadata.eventType).toBe('STATE_CHANGE');
  });

  it('filters business events by user, resource and date', async () => {
    const { service, audit } = setup();

    await service.query({
      performedBy: 'user-1',
      entityType: 'Payment',
      entityId: 'payment-1',
      startDate: '2026-01-01T00:00:00Z',
      endDate: '2026-02-01T00:00:00Z',
      page: 2,
      limit: 10,
    });

    expect(audit.query).toHaveBeenCalledWith(
      expect.objectContaining({
        performedBy: 'user-1',
        entityType: 'Payment',
        entityId: 'payment-1',
        startDate: '2026-01-01T00:00:00Z',
        endDate: '2026-02-01T00:00:00Z',
        page: 2,
        limit: 10,
        businessEventsOnly: true,
      }),
    );
  });

  it('rejects mutation attempts at the entity boundary', () => {
    const { AuditLog } = require('./entities/audit-log.entity');
    const entry = Object.create(AuditLog.prototype);

    expect(() => entry.assertImmutable('update')).toThrow(/immutable/i);
    expect(() => entry.assertImmutable('remove')).toThrow(/immutable/i);
  });
});
