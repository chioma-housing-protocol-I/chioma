import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import axios from 'axios';
import { EncryptionService } from '../security/encryption.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { AuditAction, AuditLevel } from '../audit/entities/audit-log.entity';
import { UserRole } from '../users/entities/user.entity';
import { TenantScreeningRequest } from './entities/tenant-screening-request.entity';
import { TenantScreeningConsent } from './entities/tenant-screening-consent.entity';
import { TenantScreeningReport } from './entities/tenant-screening-report.entity';
import { CreateTenantScreeningRequestDto } from './dto/create-tenant-screening-request.dto';
import { GrantTenantScreeningConsentDto } from './dto/grant-tenant-screening-consent.dto';
import { TenantScreeningWebhookDto } from './dto/tenant-screening-webhook.dto';
import {
  TenantScreeningProvider,
  TenantScreeningRiskLevel,
  TenantScreeningStatus,
} from './screening.enums';

type RequestActor = {
  id: string;
  role: UserRole;
  ipAddress?: string;
  userAgent?: string;
};

type ProviderSubmissionResponse = {
  providerReference: string;
  status: TenantScreeningStatus;
  report?: Record<string, unknown>;
  providerReportId?: string;
  riskLevel?: TenantScreeningRiskLevel;
};

@Injectable()
export class ScreeningService {
  private readonly logger = new Logger(ScreeningService.name);

  constructor(
    @InjectRepository(TenantScreeningRequest)
    private readonly screeningRepository: Repository<TenantScreeningRequest>,
    @InjectRepository(TenantScreeningConsent)
    private readonly consentRepository: Repository<TenantScreeningConsent>,
    @InjectRepository(TenantScreeningReport)
    private readonly reportRepository: Repository<TenantScreeningReport>,
    private readonly configService: ConfigService,
    private readonly encryptionService: EncryptionService,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
    private readonly webhooksService: WebhooksService,
  ) {}

  async createRequest(
    actor: RequestActor,
    dto: CreateTenantScreeningRequestDto,
  ): Promise<TenantScreeningRequest> {
    const provider = dto.provider ?? this.getDefaultProvider();
    const consentTtlDays = Number(
      this.configService.get<string>('TENANT_SCREENING_CONSENT_TTL_DAYS', '30'),
    );
    const screening = this.screeningRepository.create({
      tenantId: dto.tenantId,
      requestedByUserId: actor.id,
      provider,
      requestedChecks: dto.requestedChecks,
      status: TenantScreeningStatus.PENDING_CONSENT,
      consentRequired: true,
      consentVersion: dto.consentVersion,
      consentExpiresAt: new Date(
        Date.now() + consentTtlDays * 24 * 60 * 60 * 1000,
      ),
      encryptedApplicantData: this.encryptionService.encrypt(
        JSON.stringify(dto.applicantData),
      ),
      metadata: {
        propertyId: dto.propertyId ?? null,
        notes: dto.notes ?? null,
      },
    });

    const saved = await this.screeningRepository.save(screening);
    await this.auditService.log({
      action: AuditAction.CREATE,
      entityType: 'TenantScreeningRequest',
      entityId: saved.id,
      performedBy: actor.id,
      level: AuditLevel.SECURITY,
      metadata: {
        provider,
        tenantId: dto.tenantId,
        requestedChecks: dto.requestedChecks,
      },
    });

    return saved;
  }

  async grantConsent(
    screeningId: string,
    actor: RequestActor,
    dto: GrantTenantScreeningConsentDto,
  ): Promise<TenantScreeningRequest> {
    const screening = await this.requireScreening(screeningId);
    if (actor.role !== UserRole.ADMIN && screening.tenantId !== actor.id) {
      throw new ForbiddenException(
        'Only the tenant or an admin can grant consent',
      );
    }

    if (screening.status !== TenantScreeningStatus.PENDING_CONSENT) {
      throw new BadRequestException('Consent has already been processed');
    }

    const consent = this.consentRepository.create({
      screeningId: screening.id,
      tenantId: screening.tenantId,
      provider: screening.provider,
      consentTextVersion: dto.consentTextVersion,
      grantedAt: new Date(),
      expiresAt: dto.expiresAt
        ? new Date(dto.expiresAt)
        : screening.consentExpiresAt,
      ipAddress: actor.ipAddress ?? null,
      userAgent: actor.userAgent ?? null,
    });

    await this.consentRepository.save(consent);
    screening.status = TenantScreeningStatus.CONSENTED;
    screening.consentGrantedAt = consent.grantedAt;
    screening.consentVersion = dto.consentTextVersion;
    await this.screeningRepository.save(screening);

    await this.auditService.log({
      action: AuditAction.UPDATE,
      entityType: 'TenantScreeningConsent',
      entityId: consent.id,
      performedBy: actor.id,
      level: AuditLevel.SECURITY,
      metadata: {
        screeningId: screening.id,
        consentVersion: dto.consentTextVersion,
      },
    });

    return this.submitToProvider(screening, consent);
  }

  async getScreening(
    screeningId: string,
    actor: Pick<RequestActor, 'id' | 'role'>,
  ): Promise<TenantScreeningRequest> {
    const screening = await this.requireScreening(screeningId);
    this.assertCanAccess(screening, actor);
    return screening;
  }

  async getScreeningReport(
    screeningId: string,
    actor: Pick<RequestActor, 'id' | 'role'>,
  ): Promise<Record<string, unknown>> {
    const screening = await this.requireScreening(screeningId);
    this.assertCanAccess(screening, actor);

    const report = await this.reportRepository.findOne({
      where: { screeningId },
    });
    if (!report) {
      throw new NotFoundException('Screening report not available');
    }

    const decryptedReport = JSON.parse(
      this.encryptionService.decrypt(report.encryptedReport),
    ) as Record<string, unknown>;

    await this.auditService.log({
      action: AuditAction.DATA_ACCESS,
      entityType: 'TenantScreeningReport',
      entityId: report.id,
      performedBy: actor.id,
      level: AuditLevel.SECURITY,
      metadata: { screeningId },
    });

    return {
      screeningId,
      riskLevel: report.riskLevel,
      providerReportId: report.providerReportId,
      report: decryptedReport,
      accessExpiresAt: report.accessExpiresAt,
    };
  }

  async handleProviderWebhook(
    dto: TenantScreeningWebhookDto,
  ): Promise<TenantScreeningRequest> {
    const screening = await this.screeningRepository.findOne({
      where: { providerReference: dto.providerReference },
    });
    if (!screening) {
      throw new NotFoundException('Screening request not found');
    }

    screening.status = dto.status;
    screening.failureReason = dto.failureReason ?? null;
    screening.completedAt =
      dto.status === TenantScreeningStatus.COMPLETED ||
      dto.status === TenantScreeningStatus.FAILED
        ? new Date()
        : screening.completedAt;

    const saved = await this.screeningRepository.save(screening);

    if (dto.report) {
      await this.storeReport(
        screening,
        dto.report,
        dto.riskLevel,
        dto.providerReportId,
      );
    }

    await this.notifyStakeholders(saved);
    return saved;
  }

  private async submitToProvider(
    screening: TenantScreeningRequest,
    consent: TenantScreeningConsent,
  ): Promise<TenantScreeningRequest> {
    const applicantData = JSON.parse(
      this.encryptionService.decrypt(screening.encryptedApplicantData),
    ) as Record<string, unknown>;

    const providerResponse = await this.submitProviderRequest(
      screening,
      consent,
      applicantData,
    );

    screening.providerReference = providerResponse.providerReference;
    screening.status = providerResponse.status;
    screening.submittedAt = new Date();
    screening.failureReason =
      providerResponse.status === TenantScreeningStatus.FAILED
        ? 'Provider rejected screening request'
        : null;

    const saved = await this.screeningRepository.save(screening);

    if (providerResponse.report) {
      await this.storeReport(
        saved,
        providerResponse.report,
        providerResponse.riskLevel,
        providerResponse.providerReportId,
      );
    }

    await this.notifyStakeholders(saved);
    return saved;
  }

  private async submitProviderRequest(
    screening: TenantScreeningRequest,
    consent: TenantScreeningConsent,
    applicantData: Record<string, unknown>,
  ): Promise<ProviderSubmissionResponse> {
    if (this.isSandboxMode()) {
      const providerReference = `sandbox-${screening.id}`;
      return {
        providerReference,
        status: TenantScreeningStatus.COMPLETED,
        providerReportId: `report-${screening.id}`,
        riskLevel: TenantScreeningRiskLevel.REVIEW,
        report: {
          provider: screening.provider,
          checks: screening.requestedChecks,
          creditScoreBand: '680-719',
          backgroundStatus: 'clear',
          rentalHistoryStatus: 'verified',
          recommendation: 'manual_review',
          applicant: {
            email: applicantData.email ?? null,
            legalName: applicantData.legalName ?? null,
          },
          consent: {
            version: consent.consentTextVersion,
            grantedAt: consent.grantedAt.toISOString(),
          },
        },
      };
    }

    const providerConfig = this.getProviderConfig(screening.provider);
    const response = await axios.post<{
      id: string;
      status: string;
      report?: Record<string, unknown>;
      providerReportId?: string;
      riskLevel?: TenantScreeningRiskLevel;
    }>(
      `${providerConfig.baseUrl}/screenings`,
      {
        tenantId: screening.tenantId,
        externalReference: screening.id,
        requestedChecks: screening.requestedChecks,
        applicantData,
        consent: {
          version: consent.consentTextVersion,
          grantedAt: consent.grantedAt.toISOString(),
          expiresAt: consent.expiresAt?.toISOString(),
          ipAddress: consent.ipAddress,
          userAgent: consent.userAgent,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${providerConfig.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      },
    );

    return {
      providerReference: response.data.id,
      status: this.mapProviderStatus(response.data.status),
      report: response.data.report,
      providerReportId: response.data.providerReportId,
      riskLevel: response.data.riskLevel,
    };
  }

  private async storeReport(
    screening: TenantScreeningRequest,
    reportData: Record<string, unknown>,
    riskLevel?: TenantScreeningRiskLevel,
    providerReportId?: string,
  ): Promise<void> {
    const encryptedReport = this.encryptionService.encrypt(
      JSON.stringify(reportData),
    );
    const existing = await this.reportRepository.findOne({
      where: { screeningId: screening.id },
    });

    const accessWindowDays = Number(
      this.configService.get<string>('TENANT_SCREENING_REPORT_TTL_DAYS', '30'),
    );
    const report = this.reportRepository.create({
      ...(existing ?? {}),
      screeningId: screening.id,
      providerReportId: providerReportId ?? existing?.providerReportId ?? null,
      encryptedReport,
      riskLevel: riskLevel ?? existing?.riskLevel ?? null,
      accessExpiresAt: new Date(
        Date.now() + accessWindowDays * 24 * 60 * 60 * 1000,
      ),
    });

    screening.status = TenantScreeningStatus.COMPLETED;
    screening.completedAt = new Date();
    screening.reportSummary = this.buildReportSummary(reportData, riskLevel);
    await this.reportRepository.save(report);
    await this.screeningRepository.save(screening);
  }

  private async notifyStakeholders(
    screening: TenantScreeningRequest,
  ): Promise<void> {
    if (
      screening.status !== TenantScreeningStatus.COMPLETED &&
      screening.status !== TenantScreeningStatus.FAILED
    ) {
      return;
    }

    const type =
      screening.status === TenantScreeningStatus.COMPLETED
        ? 'screening'
        : 'screening_failed';
    const message =
      screening.status === TenantScreeningStatus.COMPLETED
        ? 'Tenant screening is complete and ready for review.'
        : `Tenant screening failed${screening.failureReason ? `: ${screening.failureReason}` : '.'}`;

    await Promise.all([
      this.notificationsService.notify(
        screening.requestedByUserId,
        'Tenant screening update',
        message,
        type,
      ),
      this.notificationsService.notify(
        screening.tenantId,
        'Tenant screening update',
        message,
        type,
      ),
      this.webhooksService.dispatchEvent(
        screening.status === TenantScreeningStatus.COMPLETED
          ? 'screening.completed'
          : 'screening.failed',
        {
          screeningId: screening.id,
          tenantId: screening.tenantId,
          requestedByUserId: screening.requestedByUserId,
          provider: screening.provider,
          status: screening.status,
          reportSummary: screening.reportSummary ?? null,
          failureReason: screening.failureReason ?? null,
        },
      ),
    ]);
  }

  private buildReportSummary(
    reportData: Record<string, unknown>,
    riskLevel?: TenantScreeningRiskLevel,
  ): Record<string, unknown> {
    return {
      riskLevel: riskLevel ?? null,
      creditScoreBand: reportData.creditScoreBand ?? null,
      backgroundStatus: reportData.backgroundStatus ?? null,
      rentalHistoryStatus: reportData.rentalHistoryStatus ?? null,
      recommendation: reportData.recommendation ?? null,
    };
  }

  private assertCanAccess(
    screening: TenantScreeningRequest,
    actor: Pick<RequestActor, 'id' | 'role'>,
  ): void {
    if (actor.role === UserRole.ADMIN) {
      return;
    }

    if (
      screening.tenantId === actor.id ||
      screening.requestedByUserId === actor.id
    ) {
      return;
    }

    throw new ForbiddenException('You do not have access to this screening');
  }

  private async requireScreening(
    screeningId: string,
  ): Promise<TenantScreeningRequest> {
    const screening = await this.screeningRepository.findOne({
      where: { id: screeningId },
    });
    if (!screening) {
      throw new NotFoundException('Screening request not found');
    }
    return screening;
  }

  private isSandboxMode(): boolean {
    return (
      this.configService.get<string>(
        'TENANT_SCREENING_SANDBOX_MODE',
        'true',
      ) === 'true'
    );
  }

  private getDefaultProvider(): TenantScreeningProvider {
    return (
      (this.configService.get<string>('TENANT_SCREENING_DEFAULT_PROVIDER') as
        | TenantScreeningProvider
        | undefined) ?? TenantScreeningProvider.TRANSUNION_SMARTMOVE
    );
  }

  private getProviderConfig(provider: TenantScreeningProvider): {
    baseUrl: string;
    apiKey: string;
  } {
    const configMap = {
      [TenantScreeningProvider.TRANSUNION_SMARTMOVE]: {
        baseUrl:
          this.configService.get<string>('TRANSUNION_SMARTMOVE_API_URL') ?? '',
        apiKey:
          this.configService.get<string>('TRANSUNION_SMARTMOVE_API_KEY') ?? '',
      },
      [TenantScreeningProvider.EXPERIAN_CONNECT]: {
        baseUrl:
          this.configService.get<string>('EXPERIAN_CONNECT_API_URL') ?? '',
        apiKey:
          this.configService.get<string>('EXPERIAN_CONNECT_API_KEY') ?? '',
      },
    };

    const providerConfig = configMap[provider];
    if (!providerConfig.baseUrl || !providerConfig.apiKey) {
      throw new ServiceUnavailableException(
        `${provider} screening provider is not configured`,
      );
    }

    return providerConfig;
  }

  private mapProviderStatus(status: string): TenantScreeningStatus {
    const normalized = status.toUpperCase();
    switch (normalized) {
      case 'COMPLETED':
      case 'APPROVED':
        return TenantScreeningStatus.COMPLETED;
      case 'FAILED':
      case 'REJECTED':
        return TenantScreeningStatus.FAILED;
      case 'PROCESSING':
      case 'IN_PROGRESS':
        return TenantScreeningStatus.IN_PROGRESS;
      default:
        return TenantScreeningStatus.SUBMITTED;
    }
  }
}
