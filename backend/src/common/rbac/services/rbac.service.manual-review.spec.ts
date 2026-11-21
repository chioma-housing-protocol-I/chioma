import { KycStatus } from '../../../modules/kyc/kyc-status.enum';
import { UserRole } from '../../../modules/users/entities/user.entity';
import { Permission } from '../permissions.enum';
import { RbacService } from './rbac.service';

describe('limited permissions while KYC is in manual review (#2177)', () => {
  const service = new RbacService();

  it('drops privileged permissions but keeps read and resubmit rights', () => {
    const permissions = service.getPermissionsForRole(
      UserRole.USER,
      KycStatus.MANUAL_REVIEW,
    );

    expect(permissions).toContain(Permission.KYC_SUBMIT);
    expect(permissions).toContain(Permission.KYC_READ);
    expect(permissions).not.toContain(Permission.PAYMENT_CREATE);
    expect(permissions).not.toContain(Permission.AGREEMENT_SIGN);
    expect(permissions).not.toContain(Permission.PROPERTY_CREATE);
  });

  it('applies the restriction to hasPermission and canAccess', () => {
    expect(
      service.hasPermission(
        UserRole.USER,
        Permission.PAYMENT_CREATE,
        KycStatus.MANUAL_REVIEW,
      ),
    ).toBe(false);
    expect(
      service.hasPermission(
        UserRole.USER,
        Permission.PAYMENT_CREATE,
        KycStatus.APPROVED,
      ),
    ).toBe(true);
    expect(
      service.canAccess(
        UserRole.USER,
        'user-1',
        Permission.PAYMENT_CREATE,
        'user-1',
        KycStatus.MANUAL_REVIEW,
      ),
    ).toBe(false);
  });

  it('leaves users with other KYC statuses unchanged', () => {
    const standard = service.getPermissionsForRole(UserRole.USER);
    const pending = service.getPermissionsForRole(
      UserRole.USER,
      KycStatus.PENDING,
    );

    expect(pending).toEqual(standard);
  });
});
