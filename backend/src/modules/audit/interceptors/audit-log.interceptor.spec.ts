import { lastValueFrom, of, throwError } from 'rxjs';
import { Reflector } from '@nestjs/core';
import {
  AuditAction,
  AuditLevel,
  AuditStatus,
} from '../entities/audit-log.entity';
import { AuditLogOptions } from '../decorators/audit-log.decorator';
import { AuditLogInterceptor } from './audit-log.interceptor';

describe('AuditLogInterceptor authentication events', () => {
  const auditService = { log: jest.fn().mockResolvedValue(undefined) };

  beforeEach(() => {
    auditService.log.mockClear();
  });

  function createRequestContext(
    options: AuditLogOptions,
    request: Record<string, any>,
  ) {
    const reflector = {
      get: jest.fn().mockReturnValue(options),
    } as unknown as Reflector;
    const interceptor = new AuditLogInterceptor(auditService as any, reflector);
    const context = {
      getHandler: () => createRequestContext,
      switchToHttp: () => ({ getRequest: () => request }),
    } as any;

    return interceptor.intercept.bind(interceptor, context);
  }

  const request = (user?: { id: string }) => ({
    method: 'POST',
    url: '/auth/event',
    headers: {},
    ip: '192.0.2.10',
    user,
    get: () => 'test-agent',
  });

  it('records successful logins against the authenticated user', async () => {
    const intercept = createRequestContext(
      {
        action: AuditAction.LOGIN,
        entityType: 'User',
        level: AuditLevel.INFO,
      },
      request(),
    );

    await lastValueFrom(
      intercept({ handle: () => of({ user: { id: 'user-1' } }) } as any),
    );

    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditAction.LOGIN,
        entityType: 'User',
        entityId: 'user-1',
        status: AuditStatus.SUCCESS,
        ipAddress: '192.0.2.10',
        userAgent: 'test-agent',
      }),
    );
  });

  it('records failed logins with failure status and request context', async () => {
    const intercept = createRequestContext(
      {
        action: AuditAction.LOGIN,
        entityType: 'User',
        level: AuditLevel.INFO,
      },
      request(),
    );

    await expect(
      lastValueFrom(
        intercept({
          handle: () => throwError(() => new Error('Invalid credentials')),
        } as any),
      ),
    ).rejects.toThrow('Invalid credentials');

    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditAction.LOGIN,
        status: AuditStatus.FAILURE,
        errorMessage: 'Invalid credentials',
        ipAddress: '192.0.2.10',
        userAgent: 'test-agent',
      }),
    );
  });

  it('records logout against the user from the authenticated request', async () => {
    const intercept = createRequestContext(
      {
        action: AuditAction.LOGOUT,
        entityType: 'User',
        level: AuditLevel.INFO,
      },
      request({ id: 'user-2' }),
    );

    await lastValueFrom(intercept({ handle: () => of({ message: 'ok' }) } as any));

    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditAction.LOGOUT,
        entityId: 'user-2',
        performedBy: 'user-2',
        status: AuditStatus.SUCCESS,
      }),
    );
  });

  it('records permission changes against the acting admin', async () => {
    const intercept = createRequestContext(
      {
        action: AuditAction.PERMISSION_CHANGE,
        entityType: 'Rbac',
        level: AuditLevel.SECURITY,
      },
      request({ id: 'admin-1' }),
    );

    await lastValueFrom(intercept({ handle: () => of(undefined) } as any));

    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditAction.PERMISSION_CHANGE,
        entityId: 'admin-1',
        performedBy: 'admin-1',
        status: AuditStatus.SUCCESS,
      }),
    );
  });
});