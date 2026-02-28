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
  ParseIntPipe,
  DefaultValuePipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
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

@ApiTags('Security')
@Controller()
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

  @Get('api/v1/security/events')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get recent security events' })
  @ApiQuery({ name: 'hours', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Security events retrieved' })
  async getSecurityEvents(
    @Query('hours', new DefaultValuePipe(24), ParseIntPipe) hours: number,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
  ) {
    return this.securityEventsService.getRecentEvents(hours, limit);
  }

  @Get('api/v1/security/events/user/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get security events for a specific user' })
  @ApiParam({ name: 'userId', type: String })
  async getUserEvents(
    @Param('userId') userId: string,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    return this.securityEventsService.getUserEvents(userId, limit, offset);
  }

  @Get('api/v1/security/events/suspicious/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check for suspicious activity on a user account' })
  async detectSuspicious(@Param('userId') userId: string) {
    const suspicious =
      await this.securityEventsService.detectSuspiciousActivity(userId);
    return { userId, suspicious };
  }

  // ─── Threat Detection ─────────────────────────────────────────────────────

  @Get('api/v1/security/threats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get recent threat events' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getThreats(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.threatDetectionService.getRecentThreats(limit);
  }

  @Get('api/v1/security/threats/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get threat detection statistics' })
  @ApiQuery({ name: 'hours', required: false, type: Number })
  async getThreatStats(
    @Query('hours', new DefaultValuePipe(24), ParseIntPipe) hours: number,
  ) {
    return this.threatDetectionService.getThreatStats(hours);
  }

  @Patch('api/v1/security/threats/:id/false-positive')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark a threat event as false positive' })
  async markFalsePositive(@Param('id') threatId: string) {
    await this.threatDetectionService.markFalsePositive(threatId);
  }

  // ─── Incident Management ──────────────────────────────────────────────────

  @Get('api/v1/security/incidents')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get open security incidents' })
  async getIncidents() {
    return this.incidentService.getOpenIncidents();
  }

  @Get('api/v1/security/incidents/metrics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get incident response KPIs (MTTD / MTTR)' })
  async getIncidentMetrics() {
    return this.incidentService.getResponseMetrics();
  }

  @Post('api/v1/security/incidents/:id/resolve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resolve a security incident' })
  async resolveIncident(
    @Param('id') incidentId: string,
    @Body('resolution') resolution: string,
  ) {
    return this.incidentService.resolveIncident(
      incidentId,
      resolution ?? 'Resolved by admin',
    );
  }

  @Get('api/v1/security/incidents/:id/report')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate a post-incident report' })
  async getIncidentReport(@Param('id') incidentId: string) {
    return this.incidentService.generateIncidentReport(incidentId);
  }

  // ─── Compliance Reports ───────────────────────────────────────────────────

  @Get('api/v1/security/compliance/score')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get overall security compliance score' })
  async getComplianceScore() {
    return this.complianceService.getSecurityScore();
  }

  @Get('api/v1/security/compliance/gdpr')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate GDPR compliance report' })
  @ApiQuery({
    name: 'from',
    required: false,
    type: String,
    description: 'ISO date',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    type: String,
    description: 'ISO date',
  })
  async getGdprReport(
    @Query('from') fromStr?: string,
    @Query('to') toStr?: string,
  ) {
    const to = toStr ? new Date(toStr) : new Date();
    const from = fromStr
      ? new Date(fromStr)
      : new Date(to.getTime() - 30 * 24 * 3600 * 1000);
    return this.complianceService.generateGdprReport(from, to);
  }

  @Get('api/v1/security/compliance/soc2')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate SOC2 Type II compliance report' })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  async getSoc2Report(
    @Query('from') fromStr?: string,
    @Query('to') toStr?: string,
  ) {
    const to = toStr ? new Date(toStr) : new Date();
    const from = fromStr
      ? new Date(fromStr)
      : new Date(to.getTime() - 30 * 24 * 3600 * 1000);
    return this.complianceService.generateSoc2Report(from, to);
  }

  @Get('api/v1/security/compliance/pci-dss')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate PCI-DSS compliance report' })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  async getPciDssReport(
    @Query('from') fromStr?: string,
    @Query('to') toStr?: string,
  ) {
    const to = toStr ? new Date(toStr) : new Date();
    const from = fromStr
      ? new Date(fromStr)
      : new Date(to.getTime() - 30 * 24 * 3600 * 1000);
    return this.complianceService.generatePciDssReport(from, to);
  }

  // ─── RBAC Management ─────────────────────────────────────────────────────

  @Get('api/v1/security/rbac/roles')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all RBAC roles with permissions' })
  async getRoles() {
    return this.rbacService.findAllRoles();
  }

  @Get('api/v1/security/rbac/permissions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all permissions' })
  async getPermissions() {
    return this.rbacService.findAllPermissions();
  }

  @Post('api/v1/security/rbac/seed')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Seed default RBAC roles and permissions' })
  async seedRbac() {
    await this.rbacService.seedDefaultRoles();
  }

  // ─── Blockchain Audit Anchoring ───────────────────────────────────────────

  @Post('api/v1/security/audit/anchor')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Anchor latest audit log batch to blockchain' })
  @ApiQuery({ name: 'batchSize', required: false, type: Number })
  async anchorAuditLogs(
    @Query('batchSize', new DefaultValuePipe(100), ParseIntPipe)
    batchSize: number,
  ) {
    const result =
      await this.blockchainAuditService.anchorAuditBatch(batchSize);
    if (!result) return { message: 'No un-anchored audit logs found' };
    return result;
  }
}
