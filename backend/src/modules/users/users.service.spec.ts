import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UsersService } from './users.service';
import { User, UserRole, AuthMethod } from './entities/user.entity';
import { UserNotificationPreference } from './entities/user-notification-preference.entity';
import { KycStatus } from '../kyc/kyc-status.enum';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';

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
    save: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    delete: jest.fn(),
    restore: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  const mockNotificationPreferenceRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
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

  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      const updateDto = {
        firstName: 'Updated',
        lastName: 'Name',
        phoneNumber: '+1234567890',
      };

      const updatedUser = { ...mockUser, ...updateDto };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(updatedUser);

      const result = await service.updateProfile('1', updateDto);

      expect(result.firstName).toBe('Updated');
      expect(result.lastName).toBe('Name');
      expect(mockUserRepository.save).toHaveBeenCalled();
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
