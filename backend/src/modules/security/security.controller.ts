import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  Res,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseInterceptors,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { SecurityEventsService } from './security-events.service';
import { ThreatDetectionService } from './threat-detection.service';
import { SecurityIncidentService } from './security-incident.service';
import { ComplianceService } from './compliance.service';
import { RbacService } from './rbac.service';
import { BlockchainAuditService } from './blockchain-audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import { AuditAction, AuditLevel } from '../audit/entities/audit-log.entity';
import { AuditLogInterceptor } from '../audit/interceptors/audit-log.interceptor';
import {
  QuerySecurityEventsDto,
  QueryUserSecurityEventsDto,
  QueryThreatsDto,
  QueryThreatStatsDto,
  QueryComplianceReportDto,
  ResolveIncidentDto,
  AnchorAuditLogsDto,
} from './dto';

@ApiTags('Security')
@Controller()
@UseInterceptors(AuditLogInterceptor)
export class SecurityController {
  constructor(
    private readonly configService: ConfigService,
    private readonly securityEventsService: SecurityEventsService,
    private readonly threatDetectionService: ThreatDetectionService,
    private readonly incidentService: SecurityIncidentService,
    private readonly complianceService: ComplianceService,
    private readonly rbacService: RbacService,
    private readonly blockchainAuditService: BlockchainAuditService,
  ) {}

  // ─── Public endpoints ─────────────────────────────────────────────────────

  @Get('security.txt')
  @Get('.well-known/security.txt')
  @ApiOperation({
    summary: 'Security policy information',
    description: 'Returns security contact and policy information per RFC 9116',
  })
  @ApiResponse({
    status: 200,
    description: 'Security.txt content',
    content: { 'text/plain': { schema: { type: 'string' } } },
  })
  getSecurityTxt(@Res() res: Response): void {
    const contact =
      this.configService.get<string>('SECURITY_CONTACT') ||
      'security@chioma.app';
    const policy =
      this.configService.get<string>('SECURITY_POLICY_URL') ||
      'https://chioma.app/security';
    const ack =
      this.configService.get<string>('SECURITY_ACKNOWLEDGMENTS_URL') ||
      'https://chioma.app/security/acknowledgments';
    const langs =
      this.configService.get<string>('SECURITY_PREFERRED_LANGUAGES') || 'en';
    const canonical =
      this.configService.get<string>('SECURITY_CANONICAL_URL') ||
      'https://chioma.app/.well-known/security.txt';
    const expires =
      this.configService.get<string>('SECURITY_EXPIRES') ||
      new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

    const txt = [
      `Contact: ${contact}`,
      `Expires: ${expires}`,
      `Preferred-Languages: ${langs}`,
      `Canonical: ${canonical}`,
      `Policy: ${policy}`,
      `Acknowledgments: ${ack}`,
    ].join('\n');

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(txt);
  }

  // ─── Security Events ──────────────────────────────────────────────────────

  @Get('security/events')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get recent security events' })
  @ApiResponse({ status: 200, description: 'Security events retrieved' })
  async getSecurityEvents(@Query() query: QuerySecurityEventsDto) {
    return this.securityEventsService.getRecentEvents(query.hours, query.limit);
  }

  @Get('security/events/user/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get security events for a specific user' })
  @ApiParam({ name: 'userId', type: String })
  async getUserEvents(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query() query: QueryUserSecurityEventsDto,
  ) {
    return this.securityEventsService.getUserEvents(
      userId,
      query.limit,
      query.offset,
    );
  }

  @Get('security/events/suspicious/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check for suspicious activity on a user account' })
  async detectSuspicious(@Param('userId', ParseUUIDPipe) userId: string) {
    const suspicious =
      await this.securityEventsService.detectSuspiciousActivity(userId);
    return { userId, suspicious };
  }

  // ─── Threat Detection ─────────────────────────────────────────────────────

  @Get('security/threats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get recent threat events' })
  async getThreats(@Query() query: QueryThreatsDto) {
    return this.threatDetectionService.getRecentThreats(query.limit);
  }

  @Get('security/threats/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get threat detection statistics' })
  async getThreatStats(@Query() query: QueryThreatStatsDto) {
    return this.threatDetectionService.getThreatStats(query.hours);
  }

  @Patch('security/threats/:id/false-positive')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark a threat event as false positive' })
  @AuditLog({
    action: AuditAction.SECURITY_INCIDENT,
    entityType: 'ThreatEvent',
    level: AuditLevel.SECURITY,
    includeNewValues: true,
  })
  async markFalsePositive(@Param('id', ParseUUIDPipe) threatId: string) {
    await this.threatDetectionService.markFalsePositive(threatId);
  }

  // ─── Incident Management ──────────────────────────────────────────────────

  @Get('security/incidents')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get open security incidents' })
  async getIncidents() {
    return this.incidentService.getOpenIncidents();
  }

  @Get('security/incidents/metrics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get incident response KPIs (MTTD / MTTR)' })
  async getIncidentMetrics() {
    return this.incidentService.getResponseMetrics();
  }

  @Post('security/incidents/:id/resolve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resolve a security incident' })
  @AuditLog({
    action: AuditAction.SECURITY_INCIDENT,
    entityType: 'SecurityIncident',
    level: AuditLevel.SECURITY,
    includeNewValues: true,
  })
  async resolveIncident(
    @Param('id') incidentId: string,
    @Body() dto: ResolveIncidentDto,
  ) {
    return this.incidentService.resolveIncident(
      incidentId,
      dto.resolution ?? 'Resolved by admin',
    );
  }

  @Get('security/incidents/:id/report')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate a post-incident report' })
  async getIncidentReport(@Param('id') incidentId: string) {
    return this.incidentService.generateIncidentReport(incidentId);
  }

  // ─── Compliance Reports ───────────────────────────────────────────────────

  @Get('security/compliance/score')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get overall security compliance score' })
  async getComplianceScore() {
    return this.complianceService.getSecurityScore();
  }

  @Get('security/compliance/gdpr')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate GDPR compliance report' })
  async getGdprReport(@Query() query: QueryComplianceReportDto) {
    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from
      ? new Date(query.from)
      : new Date(to.getTime() - 30 * 24 * 3600 * 1000);
    return this.complianceService.generateGdprReport(from, to);
  }

  @Get('security/compliance/soc2')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate SOC2 Type II compliance report' })
  async getSoc2Report(@Query() query: QueryComplianceReportDto) {
    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from
      ? new Date(query.from)
      : new Date(to.getTime() - 30 * 24 * 3600 * 1000);
    return this.complianceService.generateSoc2Report(from, to);
  }

  @Get('security/compliance/pci-dss')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate PCI-DSS compliance report' })
  async getPciDssReport(@Query() query: QueryComplianceReportDto) {
    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from
      ? new Date(query.from)
      : new Date(to.getTime() - 30 * 24 * 3600 * 1000);
    return this.complianceService.generatePciDssReport(from, to);
  }

  // ─── RBAC Management ─────────────────────────────────────────────────────

  @Get('security/rbac/roles')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all RBAC roles with permissions' })
  async getRoles() {
    return this.rbacService.findAllRoles();
  }

  @Get('security/rbac/permissions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all permissions' })
  async getPermissions() {
    return this.rbacService.findAllPermissions();
  }

  @Post('security/rbac/seed')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Seed default RBAC roles and permissions' })
  @AuditLog({
    action: AuditAction.PERMISSION_CHANGE,
    entityType: 'Rbac',
    level: AuditLevel.SECURITY,
  })
  async seedRbac() {
    await this.rbacService.seedDefaultRoles();
  }

  // ─── Blockchain Audit Anchoring ───────────────────────────────────────────

  @Post('security/audit/anchor')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Anchor latest audit log batch to blockchain' })
  @AuditLog({
    action: AuditAction.BLOCKCHAIN_TX_SUBMITTED,
    entityType: 'AuditBatch',
    level: AuditLevel.SECURITY,
    includeNewValues: true,
  })
  async anchorAuditLogs(@Query() query: AnchorAuditLogsDto) {
    const result = await this.blockchainAuditService.anchorAuditBatch(
      query.batchSize,
    );
    if (!result) return { message: 'No un-anchored audit logs found' };
    return result;
  }
}
