import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditLevel, AuditStatus } from '../audit/entities/audit-log.entity';
import { LoggerService } from '../../common/logger/logger.service';
import { Logging } from '../../common/logger/logging.decorator';
import { InjectRepository } from '@nestjs/repository';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import * as bcrypt from 'bcrypt';
import * as randomBytes from 'randombytes';
import { SALT_ROUNDS } from '../../common/constants';

@Logging({ service: 'UsersService' })
async exportUserData(userId: string): Promise<any> {
    // Gather all user data for export (including related entities)
    const user = await this.findById(userId, true);
    // TODO: Add related data (KYC, agreements, etc.)
    // For now, just return user entity (excluding sensitive fields)
    const { password, ...exportData } = user;
    // Audit log
    this.logger.log(`GDPR export for user: ${user.email}`);
    // TODO: Add auditService.log for compliance
    await this.auditService.log({
      action: AuditAction.DATA_EXPORT,
      entityType: 'User',
      entityId: user.id,
      performedBy: user.id,
      status: AuditStatus.SUCCESS,
      level: AuditLevel.SECURITY,
      metadata: { type: 'GDPR_EXPORT' },
    });
    return exportData;
  }

  @Logging({ service: 'UsersService' })
  async gdprDeleteAccount(userId: string): Promise<{ message: string }> {
    const user = await this.findById(userId);
    // Anonymize user data
    user.email = `deleted_${user.id}@anonymized.local`;
    user.firstName = null;
    user.lastName = null;
    user.phoneNumber = null;
    user.emailHash = null;
    user.phoneNumberHash = null;
    user.password = '';
    user.isActive = false;
    user.deletedAt = new Date();
    await this.userRepository.save(user);
    // Soft delete
    await this.userRepository.softDelete(userId);
    this.logger.log(`GDPR account deletion and anonymization for user: ${user.id}`);
    // TODO: Add auditService.log for compliance
    await this.auditService.log({
      action: AuditAction.DELETE,
      entityType: 'User',
      entityId: user.id,
      performedBy: user.id,
      status: AuditStatus.SUCCESS,
      level: AuditLevel.SECURITY,
      metadata: { type: 'GDPR_DELETE' },
    });
    return { message: 'Account deleted and data anonymized (GDPR)' };
  }

  @Logging({ service: 'UsersService' })
  async updateConsent(userId: string, consent: any): Promise<{ message: string }> {
    // Store consent preferences (simple example, should be expanded)
    const user = await this.findById(userId);
    (user as any).consent = consent;
    await this.userRepository.save(user);
    this.logger.log(`Consent updated for user: ${user.email}`);
    // TODO: Add auditService.log for compliance
    await this.auditService.log({
      action: AuditAction.UPDATE,
      entityType: 'User',
      entityId: user.id,
      performedBy: user.id,
      status: AuditStatus.SUCCESS,
      level: AuditLevel.SECURITY,
      metadata: { type: 'GDPR_CONSENT', consent },
    });
    return { message: 'Consent updated' };
  }

  async getPrivacySettings(userId: string): Promise<any> {
    // Return privacy settings (simple example)
    const user = await this.findById(userId);
    return {
      consent: (user as any).consent || {},
      dataRetention: 'standard',
    };
  }

  async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.trim().toLowerCase();
    const emailHash = this.hashLookupValue(normalizedEmail);
    return this.userRepository.findOne({
      where: [{ email: normalizedEmail }, { emailHash }],
    });
  }

  async updateProfile(
    userId: string,
    updateProfileDto: UpdateUserProfileDto,
  ): Promise<User> {
    const user = await this.findById(userId);
    Object.assign(user, updateProfileDto);
    if (updateProfileDto.phoneNumber !== undefined) {
      user.phoneNumberHash = updateProfileDto.phoneNumber
        ? this.hashLookupValue(updateProfileDto.phoneNumber)
        : null;
    }
    const updatedUser = await this.userRepository.save(user);
    this.logger.log(`Profile updated for user: ${user.email}`);
    return updatedUser;
  }

  async changeEmail(
    userId: string,
    changeEmailDto: ChangeEmailDto,
  ): Promise<{ message: string }> {
    const user = await this.findById(userId);

    const isPasswordValid = await bcrypt.compare(
      changeEmailDto.currentPassword,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    const existingUser = await this.findByEmail(changeEmailDto.newEmail);
    if (existingUser) {
      throw new BadRequestException('Email already in use');
    }

    const verificationToken = randomBytes(32).toString('hex');

    await this.userRepository.update(userId, {
      email: changeEmailDto.newEmail,
      emailHash: this.hashLookupValue(changeEmailDto.newEmail),
      emailVerified: false,
      verificationToken,
    });

    this.logger.log(
      `Email changed for user: ${user.id} from ${user.email} to ${changeEmailDto.newEmail}`,
    );

    return { message: 'Email updated. Please verify your new email address.' };
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.findById(userId);

    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    if (changePasswordDto.currentPassword === changePasswordDto.newPassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    const hashedPassword = await bcrypt.hash(
      changePasswordDto.newPassword,
      SALT_ROUNDS,
    );

    await this.userRepository.update(userId, {
      password: hashedPassword,
      refreshToken: null,
    });

    this.logger.log(`Password changed for user: ${user.email}`);

    return { message: 'Password changed successfully. Please login again.' };
  }

  async deactivateAccount(userId: string): Promise<{ message: string }> {
    const user = await this.findById(userId);

    await this.userRepository.update(userId, {
      isActive: false,
      refreshToken: null,
    });

    this.logger.log(`Account deactivated for user: ${user.email}`);

    return { message: 'Account deactivated successfully' };
  }

  async deleteAccount(userId: string): Promise<{ message: string }> {
    const user = await this.findById(userId);
    await this.userRepository.softDelete(userId);
    this.logger.log(`Account soft-deleted for user: ${user.email}`);
    return { message: 'Account deleted successfully' };
  }

  async restoreAccount(
    userRestoreDto: UserRestoreDto,
  ): Promise<{ message: string }> {
    const { email, password } = userRestoreDto;

    const user = await this.userRepository.findOne({
      where: [
        { email: email.toLowerCase() },
        { emailHash: this.hashLookupValue(email.toLowerCase()) },
      ],
      withDeleted: true,
    });

    if (!user) throw new NotFoundException('User not found');
    if (!user.deletedAt)
      throw new BadRequestException('Account is not deleted');

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      throw new UnauthorizedException('Invalid credentials');

    await this.userRepository.restore(user.id);
    await this.userRepository.update(user.id, { isActive: true });

    this.logger.log(`Account restored for user: ${user.email}`);

    return { message: 'Account restored successfully. You can now log in.' };
  }

  async hardDeleteAccount(userId: string): Promise<{ message: string }> {
    const user = await this.findById(userId, true);
    await this.userRepository.delete(userId);
    this.logger.log(`Account permanently deleted for user: ${user.email}`);
    return { message: 'Account permanently deleted' };
  }

  async getUserActivity(userId: string): Promise<any> {
    const user = await this.findById(userId);
    return {
      lastLogin: user.lastLoginAt,
      accountCreated: user.createdAt,
      emailVerified: user.emailVerified,
      isActive: user.isActive,
    };
  }

  async setKycStatus(userId: string, status: KycStatus): Promise<void> {
    await this.userRepository.update(userId, { kycStatus: status });
    this.logger.log(`KYC status updated for user ${userId}: ${status}`);
  }

  private hashLookupValue(value: string): string {
    return createHash('sha256')
      .update(value.trim().toLowerCase())
      .digest('hex');
  }
}
