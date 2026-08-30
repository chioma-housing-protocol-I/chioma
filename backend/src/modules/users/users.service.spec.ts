import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import { UsersService } from './users.service';
import { User, UserRole, AuthMethod } from './entities/user.entity';
import { UserNotificationPreference } from './entities/user-notification-preference.entity';
import { KycStatus } from '../kyc/kyc-status.enum';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';
import { LockService } from '../../common/lock';
import { EncryptionService } from '../../common/services/encryption.service';

describe('UsersService', () => {
  let service: UsersService;
  let _userRepository: Repository<User>;

  const mockUser: User = {
    id: '1',
    email: 'test@example.com',
    password: 'hashedPassword',
    firstName: 'Test',
    lastName: 'User',
    phoneNumber: null,
    avatarUrl: null,
    role: UserRole.USER,
    emailVerified: true,
    verificationToken: null,
    verificationTokenExpires: null,
    resetToken: null,
    resetTokenExpires: null,
    failedLoginAttempts: 0,
    accountLockedUntil: null,
    lastLoginAt: new Date(),
    isActive: true,
    walletAddress: null,
    authMethod: AuthMethod.PASSWORD,
    refreshToken: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    kycStatus: KycStatus.PENDING,
    loginCount: 0,
    preferredLanguage: 'en',
    timezone: 'UTC',
    twoFactorEnabled: false,
    emailNotifications: true,
    smsNotifications: false,
    marketingOptIn: false,
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    delete: jest.fn(),
    restore: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue(undefined),
    logInTransaction: jest.fn().mockResolvedValue(undefined),
  };

  const mockTransactionManager = {
    save: jest.fn().mockResolvedValue(undefined),
    softDelete: jest.fn().mockResolvedValue(undefined),
  };

  const mockDataSource = {
    transaction: jest.fn(
      async (fn: (manager: typeof mockTransactionManager) => Promise<void>) =>
        fn(mockTransactionManager),
    ),
  };

  const mockNotificationPreferenceRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockLockService = {
    withLock: jest.fn(
      async (_key: string, _ttlMs: number, fn: () => Promise<unknown>) => fn(),
    ),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(UserNotificationPreference),
          useValue: mockNotificationPreferenceRepository,
        },
        { provide: AuditService, useValue: mockAuditService },
        {
          provide: EncryptionService,
          useValue: {
            encrypt: jest.fn(async (value: string) => value),
            decrypt: jest.fn(async (value: string) => value),
          },
        },
        { provide: LockService, useValue: mockLockService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    _userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return a user by id', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.getUserById('1');

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
        withDeleted: false,
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.getUserById('999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAdminIds', () => {
    it('returns the ids of admin and super-admin users', async () => {
      mockUserRepository.find.mockResolvedValue([
        { id: 'admin-1' },
        { id: 'admin-2' },
      ]);

      const result = await service.findAdminIds();

      expect(result).toEqual(['admin-1', 'admin-2']);
      expect(mockUserRepository.find).toHaveBeenCalledWith({
        where: [{ role: UserRole.ADMIN }, { role: UserRole.SUPER_ADMIN }],
        select: ['id'],
      });
    });

    it('returns an empty array when there are no admins', async () => {
      mockUserRepository.find.mockResolvedValue([]);

      await expect(service.findAdminIds()).resolves.toEqual([]);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      const canonicalPhone = '+2348012345678';
      const updateDto = {
        firstName: 'Updated',
        lastName: 'Name',
        // The DTO guarantees the canonical E.164 value reaches the service.
        phoneNumber: canonicalPhone,
      };

      const updatedUser = { ...mockUser, ...updateDto };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(updatedUser);

      const result = await service.updateProfile('1', updateDto);

      expect(result.firstName).toBe('Updated');
      expect(result.lastName).toBe('Name');
      expect(result.phoneNumber).toBe(canonicalPhone);
      // Storage, hash and encryption all operate on the canonical value.
      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          phoneNumber: canonicalPhone,
          phoneNumberHash: createHash('sha256')
            .update(canonicalPhone)
            .digest('hex'),
        }),
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.updateProfile('999', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('changeEmail', () => {
    it('should change email successfully', async () => {
      const changeEmailDto = {
        newEmail: 'newemail@example.com',
        currentPassword: 'correctPassword',
      };

      mockUserRepository.findOne
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(null);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      mockUserRepository.update.mockResolvedValue({});

      const result = await service.changeEmail('1', changeEmailDto);

      expect(result).toHaveProperty('message');
      expect(mockUserRepository.update).toHaveBeenCalled();
    });

    it('should serialize concurrent requests through a per-user lock', async () => {
      const changeEmailDto = {
        newEmail: 'newemail@example.com',
        currentPassword: 'correctPassword',
      };

      mockUserRepository.findOne
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(null);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      mockUserRepository.update.mockResolvedValue({});

      await service.changeEmail('1', changeEmailDto);

      expect(mockLockService.withLock).toHaveBeenCalledWith(
        'user:change-email:1',
        expect.any(Number),
        expect.any(Function),
        undefined,
      );
    });

    it('should throw UnauthorizedException with wrong password', async () => {
      const changeEmailDto = {
        newEmail: 'newemail@example.com',
        currentPassword: 'wrongPassword',
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(service.changeEmail('1', changeEmailDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw BadRequestException if email already exists', async () => {
      const changeEmailDto = {
        newEmail: 'existing@example.com',
        currentPassword: 'correctPassword',
      };

      mockUserRepository.findOne
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce({ ...mockUser, email: 'existing@example.com' });
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      await expect(service.changeEmail('1', changeEmailDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const changePasswordDto = {
        currentPassword: 'oldPassword',
        newPassword: 'newPassword123!',
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jest
        .spyOn(bcrypt, 'hash')
        .mockResolvedValue('hashedNewPassword' as never);
      mockUserRepository.update.mockResolvedValue({});

      const result = await service.changePassword('1', changePasswordDto);

      expect(result).toHaveProperty('message');
      expect(mockUserRepository.update).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException with incorrect current password', async () => {
      const changePasswordDto = {
        currentPassword: 'wrongPassword',
        newPassword: 'newPassword123!',
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(
        service.changePassword('1', changePasswordDto),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException if new password same as current', async () => {
      const changePasswordDto = {
        currentPassword: 'samePassword',
        newPassword: 'samePassword',
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      await expect(
        service.changePassword('1', changePasswordDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deactivateAccount', () => {
    it('should deactivate user account', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.update.mockResolvedValue({});

      const result = await service.deactivateAccount('1');

      expect(result).toHaveProperty('message');
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({ isActive: false }),
      );
    });
  });

  describe('deleteAccount', () => {
    it('should soft delete user account', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.softDelete.mockResolvedValue({});

      const result = await service.deleteAccount('1');

      expect(result).toHaveProperty('message');
      expect(mockUserRepository.softDelete).toHaveBeenCalledWith('1');
    });
  });

  describe('gdprDeleteAccount', () => {
    it('anonymizes, soft-deletes, and audits the user inside a single transaction', async () => {
      mockUserRepository.findOne.mockResolvedValue({ ...mockUser });

      const result = await service.gdprDeleteAccount('1');

      expect(result).toEqual({
        message: 'Account deleted and data anonymized (GDPR)',
      });
      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
      expect(mockTransactionManager.save).toHaveBeenCalledWith(
        User,
        expect.objectContaining({ isActive: false, refreshToken: null }),
      );
      expect(mockTransactionManager.softDelete).toHaveBeenCalledWith(User, '1');
      expect(mockAuditService.logInTransaction).toHaveBeenCalledWith(
        mockTransactionManager,
        expect.objectContaining({
          action: AuditAction.DELETE,
          entityType: 'User',
          entityId: '1',
          metadata: { type: 'GDPR_DELETE' },
        }),
      );
    });

    it('does not soft-delete or audit when the anonymizing save fails', async () => {
      mockUserRepository.findOne.mockResolvedValue({ ...mockUser });
      mockTransactionManager.save.mockRejectedValueOnce(
        new Error('db unavailable'),
      );

      await expect(service.gdprDeleteAccount('1')).rejects.toThrow(
        'db unavailable',
      );

      expect(mockTransactionManager.softDelete).not.toHaveBeenCalled();
      expect(mockAuditService.logInTransaction).not.toHaveBeenCalled();

      // Restore default behaviour for subsequent tests.
      mockTransactionManager.save.mockResolvedValue(undefined);
    });

    it('propagates the error (and, in real usage, rolls back) when the audit write fails', async () => {
      mockUserRepository.findOne.mockResolvedValue({ ...mockUser });
      mockAuditService.logInTransaction.mockRejectedValueOnce(
        new Error('audit insert failed'),
      );

      await expect(service.gdprDeleteAccount('1')).rejects.toThrow(
        'audit insert failed',
      );

      // The transaction wrapper is what performs the rollback in a real
      // DataSource; here we assert the failure propagates out of the
      // transaction callback instead of being swallowed, which is what
      // `dataSource.transaction()` needs in order to roll back.
      expect(mockTransactionManager.softDelete).toHaveBeenCalledWith(User, '1');

      mockAuditService.logInTransaction.mockResolvedValue(undefined);
    });
  });

  describe('getUserActivity', () => {
    it('should return user activity', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.getUserActivity('1');

      expect(result).toHaveProperty('lastLogin');
      expect(result).toHaveProperty('accountCreated');
      expect(result).toHaveProperty('emailVerified');
      expect(result).toHaveProperty('isActive');
    });
  });

  describe('findAllForAdmin', () => {
    it('returns a paginated, mapped list of users', async () => {
      const listUser: User = {
        ...mockUser,
        firstName: 'Test',
        lastName: 'User',
      };
      const mockQb = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[listUser], 1]),
      };
      mockUserRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.findAllForAdmin({ page: 1, limit: 10 });

      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        id: listUser.id,
        email: listUser.email,
        name: 'Test User',
        isVerified: true,
      });
    });

    it('applies role, isVerified, and search filters', async () => {
      const mockQb = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      mockUserRepository.createQueryBuilder.mockReturnValue(mockQb);

      await service.findAllForAdmin({
        page: 1,
        limit: 10,
        role: UserRole.ADMIN,
        isVerified: true,
        search: 'test',
      });

      expect(mockQb.andWhere).toHaveBeenCalledWith('user.role = :role', {
        role: UserRole.ADMIN,
      });
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'user.emailVerified = :isVerified',
        { isVerified: true },
      );
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        { search: '%test%' },
      );
    });
  });

  describe('adminDeactivateAccount', () => {
    it('suspends the user and writes an audit log', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.update.mockResolvedValue({});

      const result = await service.adminDeactivateAccount('1', 'admin-1');

      expect(result).toHaveProperty('message');
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({ isActive: false }),
      );
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.USER_SUSPENDED,
          entityId: '1',
          performedBy: 'admin-1',
        }),
      );
    });

    it('throws NotFoundException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.adminDeactivateAccount('999', 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('adminVerifyAccount', () => {
    it('marks the user verified and writes an audit log', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.update.mockResolvedValue({});

      const result = await service.adminVerifyAccount('1', 'admin-1');

      expect(result).toHaveProperty('message');
      expect(mockUserRepository.update).toHaveBeenCalledWith('1', {
        emailVerified: true,
      });
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.USER_VERIFIED,
          entityId: '1',
          performedBy: 'admin-1',
        }),
      );
    });

    it('throws NotFoundException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.adminVerifyAccount('999', 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('adminRestoreAccount', () => {
    it('restores a soft-deleted user and reactivates them', async () => {
      const deletedUser = {
        ...mockUser,
        deletedAt: new Date(),
        isActive: false,
      };
      mockUserRepository.findOne.mockResolvedValue(deletedUser);
      mockUserRepository.restore.mockResolvedValue({});
      mockUserRepository.update.mockResolvedValue({});

      const result = await service.adminRestoreAccount('1', 'admin-1');

      expect(result).toHaveProperty('message');
      expect(mockUserRepository.restore).toHaveBeenCalledWith('1');
      expect(mockUserRepository.update).toHaveBeenCalledWith('1', {
        isActive: true,
      });
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.USER_RESTORED,
          entityId: '1',
          performedBy: 'admin-1',
        }),
      );
    });

    it('reactivates a suspended (not soft-deleted) user without calling restore', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.update.mockResolvedValue({});

      await service.adminRestoreAccount('1', 'admin-1');

      expect(mockUserRepository.restore).not.toHaveBeenCalled();
      expect(mockUserRepository.update).toHaveBeenCalledWith('1', {
        isActive: true,
      });
    });

    it('throws NotFoundException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.adminRestoreAccount('999', 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
