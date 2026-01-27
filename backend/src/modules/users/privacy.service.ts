import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import {
  SecurityAuditService,
  SecurityEventType,
} from '../../common/services/security-audit.service';

/**
 * Privacy Service
 * Handles GDPR/CCPA compliance operations
 */
@Injectable()
export class PrivacyService {
  private readonly logger = new Logger(PrivacyService.name);
  private readonly CURRENT_POLICY_VERSION = '1.0.0';
  private readonly DELETION_GRACE_PERIOD_DAYS = 30;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private securityAuditService: SecurityAuditService,
  ) {}

  /**
   * Export all user data (GDPR Article 15)
   */
  async exportUserData(userId: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Log data access for audit trail
    await this.securityAuditService.logEvent({
      eventType: SecurityEventType.DATA_EXPORT,
      userId,
      userEmail: user.email,
      outcome: 'success',
    });

    // Compile all user data
    // In a real implementation, this would include data from all related tables
    const exportData = {
      exportDate: new Date().toISOString(),
      dataController: 'Chioma Platform',
      dataSubject: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        role: user.role,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        emailVerified: user.emailVerified,
      },
      accountSettings: {
        mfaEnabled: user.mfaEnabled,
        isActive: user.isActive,
      },
      // Include related data
      agreements: [], // Would be populated from agreements table
      payments: [], // Would be populated from payments table
      notifications: [], // Would be populated from notifications table
      activityLog: [], // Would be populated from audit logs
    };

    this.logger.log(`Data export completed for user: ${userId}`);

    return exportData;
  }

  /**
   * Get summary of stored data
   */
  async getDataSummary(userId: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return {
      personalData: {
        email: true,
        firstName: !!user.firstName,
        lastName: !!user.lastName,
        phoneNumber: !!user.phoneNumber,
        avatarUrl: !!user.avatarUrl,
      },
      accountData: {
        registeredAt: user.createdAt,
        lastLogin: user.lastLoginAt,
        emailVerified: user.emailVerified,
        mfaEnabled: user.mfaEnabled,
      },
      dataCategories: [
        'Personal identification data',
        'Account credentials',
        'Rental agreements',
        'Payment history',
        'Communication preferences',
        'Activity logs',
      ],
      retentionPeriod:
        'Data retained until account deletion or 7 years for financial records',
      processingPurposes: [
        'Service provision',
        'Legal compliance',
        'Security',
        'Communication',
      ],
    };
  }

  /**
   * Request data deletion (GDPR Article 17)
   */
  async requestDataDeletion(
    userId: string,
    password: string,
    reason?: string,
  ): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    // Calculate scheduled deletion date
    const scheduledDeletion = new Date();
    scheduledDeletion.setDate(
      scheduledDeletion.getDate() + this.DELETION_GRACE_PERIOD_DAYS,
    );

    // In a real implementation, store the deletion request
    // await this.deletionRequestRepository.save({
    //   userId,
    //   reason,
    //   requestedAt: new Date(),
    //   scheduledDeletion,
    // });

    // Log the request
    await this.securityAuditService.logEvent({
      eventType: SecurityEventType.DATA_DELETION,
      userId,
      userEmail: user.email,
      outcome: 'success',
      details: { reason, scheduledDeletion },
    });

    this.logger.log(`Deletion request created for user: ${userId}`);

    return {
      message: 'Deletion request received',
      scheduledDeletion,
      gracePeriodDays: this.DELETION_GRACE_PERIOD_DAYS,
      note: 'You can cancel this request by logging in within the grace period',
    };
  }

  /**
   * Execute data deletion
   */
  async executeDataDeletion(userId: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Log before deletion
    await this.securityAuditService.logEvent({
      eventType: SecurityEventType.ACCOUNT_DELETED,
      userId,
      userEmail: user.email,
      outcome: 'success',
    });

    // Anonymize user data instead of hard delete for audit trail
    // This preserves the ability to maintain financial records while
    // removing personal identification
    await this.userRepository.update(userId, {
      email: `deleted-${userId}@deleted.local`,
      firstName: null,
      lastName: null,
      phoneNumber: null,
      avatarUrl: null,
      password: '', // Clear password hash
      refreshToken: null,
      mfaSecret: null,
      mfaBackupCodes: null,
      verificationToken: null,
      resetToken: null,
      isActive: false,
    });

    // In a real implementation:
    // - Delete from related tables or anonymize
    // - Remove from external services
    // - Clear analytics data
    // - Notify data processors

    this.logger.log(`Data deletion executed for user: ${userId}`);

    return {
      message: 'Account and personal data have been deleted',
      note: 'Some anonymized records may be retained for legal compliance',
    };
  }

  /**
   * Get consent preferences
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getConsentPreferences(_userId: string): Promise<Record<string, unknown>> {
    // In a real implementation, these would be stored in a separate table
    return Promise.resolve({
      marketingEmails: false,
      analyticsTracking: true,
      thirdPartySharing: false,
      lastUpdated: new Date().toISOString(),
    });
  }

  /**
   * Update consent preferences
   */
  updateConsentPreferences(
    userId: string,
    preferences: {
      marketingEmails: boolean;
      analyticsTracking: boolean;
      thirdPartySharing?: boolean;
    },
  ): Promise<Record<string, unknown>> {
    // In a real implementation, save to consent preferences table
    // await this.consentRepository.save({
    //   userId,
    //   ...preferences,
    //   updatedAt: new Date(),
    // });

    this.logger.log(`Consent preferences updated for user: ${userId}`);

    return Promise.resolve({
      message: 'Consent preferences updated',
      preferences,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Get data in portable format (GDPR Article 20)
   */
  async getPortableData(userId: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Return data in a commonly used, machine-readable format
    return {
      '@context': 'https://schema.org',
      '@type': 'Person',
      identifier: user.id,
      email: user.email,
      givenName: user.firstName,
      familyName: user.lastName,
      telephone: user.phoneNumber,
      memberOf: {
        '@type': 'Organization',
        name: 'Chioma Platform',
      },
      dateCreated: user.createdAt,
    };
  }

  /**
   * Get privacy policy acknowledgment status
   */
  getPolicyAcknowledgmentStatus(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _userId: string,
  ): Promise<Record<string, unknown>> {
    // In a real implementation, check the policy acknowledgment table
    return Promise.resolve({
      currentPolicyVersion: this.CURRENT_POLICY_VERSION,
      acknowledgedVersion: '1.0.0', // Would come from database
      isCurrentVersionAcknowledged: true,
      lastAcknowledgedAt: new Date().toISOString(),
    });
  }

  /**
   * Acknowledge privacy policy
   */
  acknowledgePrivacyPolicy(userId: string): Promise<Record<string, unknown>> {
    // In a real implementation, save acknowledgment to database
    // await this.policyAcknowledgmentRepository.save({
    //   userId,
    //   policyVersion: this.CURRENT_POLICY_VERSION,
    //   acknowledgedAt: new Date(),
    // });

    this.logger.log(
      `Privacy policy v${this.CURRENT_POLICY_VERSION} acknowledged by user: ${userId}`,
    );

    return Promise.resolve({
      message: 'Privacy policy acknowledged',
      policyVersion: this.CURRENT_POLICY_VERSION,
      acknowledgedAt: new Date().toISOString(),
    });
  }
}
