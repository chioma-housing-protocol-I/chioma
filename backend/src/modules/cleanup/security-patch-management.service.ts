import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { execFile } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface SecurityPatchSummary {
  packageManager: string;
  checkedAt: string;
  vulnerabilities: {
    critical: number;
    high: number;
    moderate: number;
    low: number;
    info: number;
    total: number;
  };
  recommendedAction: 'none' | 'scheduled_patch' | 'urgent_patch';
}

@Injectable()
export class SecurityPatchManagementService {
  private readonly logger = new Logger(SecurityPatchManagementService.name);

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async runScheduledSecurityPatchCheck(): Promise<void> {
    const summary = await this.checkForSecurityPatches();

    if (summary.recommendedAction === 'urgent_patch') {
      this.logger.warn(
        `Security audit found ${summary.vulnerabilities.high + summary.vulnerabilities.critical} high/critical issue(s)`,
      );
      return;
    }

    if (summary.recommendedAction === 'scheduled_patch') {
      this.logger.warn(
        `Security audit found ${summary.vulnerabilities.moderate} moderate issue(s)`,
      );
      return;
    }

    this.logger.log('Security audit completed without vulnerable packages');
  }

  async checkForSecurityPatches(
    projectRoot = process.cwd(),
  ): Promise<SecurityPatchSummary> {
    const packageManager = this.detectPackageManager(projectRoot);
    const auditJson = await this.runAudit(packageManager, projectRoot);
    const vulnerabilities = this.extractVulnerabilityCounts(auditJson);

    return {
      packageManager,
      checkedAt: new Date().toISOString(),
      vulnerabilities,
      recommendedAction: this.getRecommendedAction(vulnerabilities),
    };
  }

  private detectPackageManager(projectRoot: string): string {
    const packageJsonPath = join(projectRoot, 'package.json');
    if (existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
        packageManager?: string;
      };

      if (packageJson.packageManager?.startsWith('pnpm')) {
        return 'pnpm';
      }
    }

    if (existsSync(join(projectRoot, 'pnpm-lock.yaml'))) {
      return 'pnpm';
    }

    return 'npm';
  }

  private async runAudit(
    packageManager: string,
    projectRoot: string,
  ): Promise<unknown> {
    const command = packageManager === 'pnpm' ? 'pnpm' : 'npm';
    const args =
      packageManager === 'pnpm'
        ? ['audit', '--json']
        : ['audit', '--json', '--audit-level=low'];

    try {
      const { stdout } = await execFileAsync(command, args, {
        cwd: projectRoot,
        shell: process.platform === 'win32',
        timeout: 120_000,
      });
      return JSON.parse(stdout || '{}');
    } catch (error) {
      const auditError = error as { stdout?: string; message?: string };
      if (auditError.stdout) {
        return JSON.parse(auditError.stdout);
      }

      throw new Error(
        `Security audit failed: ${auditError.message ?? String(error)}`,
      );
    }
  }

  private extractVulnerabilityCounts(auditJson: unknown) {
    const counts = {
      critical: 0,
      high: 0,
      moderate: 0,
      low: 0,
      info: 0,
      total: 0,
    };

    const metadata = (auditJson as { metadata?: { vulnerabilities?: unknown } })
      .metadata?.vulnerabilities;

    if (metadata && typeof metadata === 'object') {
      for (const severity of Object.keys(counts) as Array<
        keyof typeof counts
      >) {
        const value = (metadata as Record<string, unknown>)[severity];
        counts[severity] = typeof value === 'number' ? value : 0;
      }
      counts.total =
        counts.total ||
        counts.critical + counts.high + counts.moderate + counts.low;
      return counts;
    }

    const advisories = (auditJson as { advisories?: Record<string, unknown> })
      .advisories;
    if (advisories) {
      for (const advisory of Object.values(advisories)) {
        const severity = (advisory as { severity?: keyof typeof counts })
          .severity;
        if (severity && severity in counts) {
          counts[severity] += 1;
          counts.total += 1;
        }
      }
    }

    return counts;
  }

  private getRecommendedAction(
    vulnerabilities: SecurityPatchSummary['vulnerabilities'],
  ): SecurityPatchSummary['recommendedAction'] {
    if (vulnerabilities.critical > 0 || vulnerabilities.high > 0) {
      return 'urgent_patch';
    }

    if (vulnerabilities.moderate > 0 || vulnerabilities.low > 0) {
      return 'scheduled_patch';
    }

    return 'none';
  }
}
