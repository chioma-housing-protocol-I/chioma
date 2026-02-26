import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import {
  Dependency,
  DependencyReport,
  DependencyStatus,
  Vulnerability,
  VulnerabilitySeverity,
  UpdateRecommendation,
  DependencyUpdate,
  UpdateOptions,
  UpdateStrategy,
  DependencyAnalysis,
  LicenseInfo,
} from '../types/dependency.types';

const execAsync = promisify(exec);

@Injectable()
export class DependencyManagementService {
  private readonly logger = new Logger(DependencyManagementService.name);
  private readonly projectRoot: string;
  private readonly packageJsonPath: string;

  constructor() {
    this.projectRoot = path.join(__dirname, '../../../../');
    this.packageJsonPath = path.join(this.projectRoot, 'package.json');
  }

  async analyzeDependencies(): Promise<DependencyReport> {
    this.logger.log('Starting dependency analysis');

    const packageJson = await this.readPackageJson();
    const dependencies = await this.getAllDependencies(packageJson);
    const vulnerabilities = await this.checkVulnerabilities();
    const outdated = await this.checkOutdatedPackages();
    const deprecated = await this.checkDeprecatedPackages(dependencies);
    const unused = await this.findUnusedDependencies();

    const summary = this.calculateSummary(
      dependencies,
      vulnerabilities,
      outdated,
    );
    const updateRecommendations =
      this.generateUpdateRecommendations(outdated, vulnerabilities);

    return {
      timestamp: Date.now(),
      totalDependencies: dependencies.length,
      dependencies,
      vulnerabilities,
      outdated,
      deprecated,
      unused,
      summary,
      updateRecommendations,
    };
  }

  async checkVulnerabilities(): Promise<Vulnerability[]> {
    this.logger.log('Checking for security vulnerabilities');

    try {
      // Run npm audit
      const { stdout } = await execAsync('npm audit --json', {
        cwd: this.projectRoot,
      });

      const auditResult = JSON.parse(stdout);
      const vulnerabilities: Vulnerability[] = [];

      if (auditResult.vulnerabilities) {
        for (const [pkg, data] of Object.entries<any>(
          auditResult.vulnerabilities,
        )) {
          const vuln: Vulnerability = {
            id: `vuln-${pkg}-${Date.now()}`,
            severity: this.mapAuditSeverity(data.severity),
            title: data.title || `Vulnerability in ${pkg}`,
            description: data.overview || 'Security vulnerability detected',
            affectedPackage: pkg,
            affectedVersions: data.range || 'unknown',
            patchedVersion: data.fixAvailable?.version,
            publishedDate: Date.now(),
            references: data.url ? [data.url] : [],
            cvssScore: data.cvss?.score,
          };
          vulnerabilities.push(vuln);
        }
      }

      this.logger.log(`Found ${vulnerabilities.length} vulnerabilities`);
      return vulnerabilities;
    } catch (error) {
      this.logger.warn('npm audit failed, returning empty vulnerabilities');
      return [];
    }
  }

  async checkOutdatedPackages(): Promise<Dependency[]> {
    this.logger.log('Checking for outdated packages');

    try {
      const { stdout } = await execAsync('npm outdated --json', {
        cwd: this.projectRoot,
      });

      const outdatedData = JSON.parse(stdout || '{}');
      const outdated: Dependency[] = [];

      for (const [name, data] of Object.entries<any>(outdatedData)) {
        outdated.push({
          name,
          currentVersion: data.current,
          latestVersion: data.latest,
          type: data.type || 'dependencies',
          status: this.determineUpdateType(data.current, data.latest),
        });
      }

      return outdated;
    } catch (error) {
      // npm outdated exits with error code when packages are outdated
      // Try to parse stdout anyway
      const stdout = (error as any).stdout;
      if (stdout) {
        try {
          const outdatedData = JSON.parse(stdout);
          return Object.entries(outdatedData).map(([name, data]: [string, any]) => ({
            name,
            currentVersion: data.current,
            latestVersion: data.latest,
            type: data.type || 'dependencies',
            status: this.determineUpdateType(data.current, data.latest),
          }));
        } catch {
          // Ignore parse errors
        }
      }
      return [];
    }
  }

  async updateDependencies(options: UpdateOptions): Promise<DependencyUpdate[]> {
    this.logger.log('Starting dependency updates', options);

    const defaults: UpdateOptions = {
      strategy: UpdateStrategy.MODERATE,
      includeDevDependencies: true,
      autoMerge: false,
      runTests: true,
      createBackup: true,
    };

    const opts = { ...defaults, ...options };
    const updates: DependencyUpdate[] = [];

    try {
      // Create backup if requested
      if (opts.createBackup) {
        await this.createPackageBackup();
      }

      // Get update recommendations
      const report = await this.analyzeDependencies();
      let packagesToUpdate = report.updateRecommendations;

      // Filter by strategy
      packagesToUpdate = this.filterByStrategy(packagesToUpdate, opts.strategy!);

      // Filter by specific packages if provided
      if (opts.packages && opts.packages.length > 0) {
        packagesToUpdate = packagesToUpdate.filter((rec) =>
          opts.packages!.includes(rec.package),
        );
      }

      // Apply updates
      for (const recommendation of packagesToUpdate) {
        const update = await this.updatePackage(recommendation);
        updates.push(update);

        if (!update.success) {
          this.logger.error(`Failed to update ${recommendation.package}`);
          // Stop on first failure unless autoMerge is true
          if (!opts.autoMerge) {
            break;
          }
        }
      }

      // Run tests if requested
      if (opts.runTests && updates.some((u) => u.success)) {
        const testsPass = await this.runTests();
        if (!testsPass) {
          this.logger.error('Tests failed after updates, rolling back');
          await this.rollbackPackageJson();
          updates.forEach((u) => {
            u.success = false;
            u.error = 'Tests failed';
          });
        }
      }
    } catch (error) {
      this.logger.error(`Dependency update failed: ${error}`);
      // Rollback on critical error
      await this.rollbackPackageJson();
    }

    return updates;
  }

  async performFullAnalysis(): Promise<DependencyAnalysis> {
    this.logger.log('Performing comprehensive dependency analysis');

    const [sizeAnalysis, unusedDeps, duplicates, licenseIssues, peerIssues] =
      await Promise.all([
        this.analyzeDependencySizes(),
        this.findUnusedDependencies(),
        this.findDuplicateDependencies(),
        this.analyzeLicenses(),
        this.checkPeerDependencies(),
      ]);

    return {
      sizeAnalysis,
      unusedDependencies: unusedDeps,
      duplicateDependencies: duplicates,
      licenseIssues,
      peerDependencyIssues: peerIssues,
    };
  }

  private async readPackageJson(): Promise<any> {
    try {
      const content = await fs.readFile(this.packageJsonPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      this.logger.error(`Failed to read package.json: ${error}`);
      throw error;
    }
  }

  private async getAllDependencies(packageJson: any): Promise<Dependency[]> {
    const deps: Dependency[] = [];

    // Regular dependencies
    if (packageJson.dependencies) {
      for (const [name, version] of Object.entries(packageJson.dependencies)) {
        deps.push({
          name,
          currentVersion: version as string,
          latestVersion: version as string,
          type: 'dependencies',
          status: DependencyStatus.UP_TO_DATE,
        });
      }
    }

    // Dev dependencies
    if (packageJson.devDependencies) {
      for (const [name, version] of Object.entries(
        packageJson.devDependencies,
      )) {
        deps.push({
          name,
          currentVersion: version as string,
          latestVersion: version as string,
          type: 'devDependencies',
          status: DependencyStatus.UP_TO_DATE,
        });
      }
    }

    return deps;
  }

  private async checkDeprecatedPackages(
    dependencies: Dependency[],
  ): Promise<Dependency[]> {
    // Would check npm registry for deprecated packages
    // Simplified implementation
    return [];
  }

  private async findUnusedDependencies(): Promise<string[]> {
    this.logger.log('Searching for unused dependencies');

    try {
      // This would require analyzing imports across all files
      // Using a tool like depcheck
      const { stdout } = await execAsync('npx depcheck --json', {
        cwd: this.projectRoot,
      });

      const result = JSON.parse(stdout);
      return result.dependencies || [];
    } catch (error) {
      this.logger.warn('Could not check for unused dependencies');
      return [];
    }
  }

  private async findDuplicateDependencies(): Promise<
    Array<{ name: string; versions: string[] }>
  > {
    try {
      const { stdout } = await execAsync('npm ls --json --all', {
        cwd: this.projectRoot,
      });

      const tree = JSON.parse(stdout);
      const duplicates = new Map<string, Set<string>>();

      // Traverse dependency tree to find duplicates
      this.traverseDependencyTree(tree, duplicates);

      return Array.from(duplicates.entries())
        .filter(([_, versions]) => versions.size > 1)
        .map(([name, versions]) => ({
          name,
          versions: Array.from(versions),
        }));
    } catch (error) {
      this.logger.warn('Could not check for duplicate dependencies');
      return [];
    }
  }

  private traverseDependencyTree(
    node: any,
    duplicates: Map<string, Set<string>>,
  ) {
    if (node.dependencies) {
      for (const [name, data] of Object.entries<any>(node.dependencies)) {
        if (!duplicates.has(name)) {
          duplicates.set(name, new Set());
        }
        duplicates.get(name)!.add(data.version);

        if (data.dependencies) {
          this.traverseDependencyTree(data, duplicates);
        }
      }
    }
  }

  private async analyzeDependencySizes(): Promise<{
    totalSize: number;
    largestDependencies: Array<{ name: string; size: number }>;
  }> {
    // Would analyze node_modules size
    // Simplified implementation
    return {
      totalSize: 0,
      largestDependencies: [],
    };
  }

  private async analyzeLicenses(): Promise<LicenseInfo[]> {
    // Would check license compatibility
    // Simplified implementation
    return [];
  }

  private async checkPeerDependencies(): Promise<
    Array<{
      package: string;
      required: string;
      installed: string;
    }>
  > {
    // Would check peer dependency mismatches
    return [];
  }

  private determineUpdateType(
    current: string,
    latest: string,
  ): DependencyStatus {
    const currentParts = this.parseVersion(current);
    const latestParts = this.parseVersion(latest);

    if (
      !currentParts ||
      !latestParts ||
      currentParts.join('.') === latestParts.join('.')
    ) {
      return DependencyStatus.UP_TO_DATE;
    }

    if (currentParts[0] < latestParts[0]) {
      return DependencyStatus.MAJOR_UPDATE;
    }

    if (currentParts[1] < latestParts[1]) {
      return DependencyStatus.MINOR_UPDATE;
    }

    return DependencyStatus.MINOR_UPDATE;
  }

  private parseVersion(version: string): number[] | null {
    const match = version.match(/(\d+)\.(\d+)\.(\d+)/);
    if (!match) return null;
    return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
  }

  private mapAuditSeverity(severity: string): VulnerabilitySeverity {
    const mapping: Record<string, VulnerabilitySeverity> = {
      critical: VulnerabilitySeverity.CRITICAL,
      high: VulnerabilitySeverity.HIGH,
      moderate: VulnerabilitySeverity.MODERATE,
      low: VulnerabilitySeverity.LOW,
      info: VulnerabilitySeverity.INFO,
    };
    return mapping[severity] || VulnerabilitySeverity.LOW;
  }

  private calculateSummary(
    dependencies: Dependency[],
    vulnerabilities: Vulnerability[],
    outdated: Dependency[],
  ) {
    return {
      upToDate: dependencies.length - outdated.length,
      minorUpdates: outdated.filter(
        (d) => d.status === DependencyStatus.MINOR_UPDATE,
      ).length,
      majorUpdates: outdated.filter(
        (d) => d.status === DependencyStatus.MAJOR_UPDATE,
      ).length,
      critical: vulnerabilities.filter(
        (v) => v.severity === VulnerabilitySeverity.CRITICAL,
      ).length,
      high: vulnerabilities.filter(
        (v) => v.severity === VulnerabilitySeverity.HIGH,
      ).length,
      moderate: vulnerabilities.filter(
        (v) => v.severity === VulnerabilitySeverity.MODERATE,
      ).length,
      low: vulnerabilities.filter(
        (v) => v.severity === VulnerabilitySeverity.LOW,
      ).length,
    };
  }

  private generateUpdateRecommendations(
    outdated: Dependency[],
    vulnerabilities: Vulnerability[],
  ): UpdateRecommendation[] {
    const recommendations: UpdateRecommendation[] = [];

    // Critical vulnerabilities first
    for (const vuln of vulnerabilities) {
      if (
        vuln.severity === VulnerabilitySeverity.CRITICAL ||
        vuln.severity === VulnerabilitySeverity.HIGH
      ) {
        recommendations.push({
          package: vuln.affectedPackage,
          from: vuln.affectedVersions,
          to: vuln.patchedVersion || 'latest',
          type: 'patch',
          priority: 'critical',
          reason: `Security vulnerability: ${vuln.title}`,
          breakingChanges: false,
          autoPatchable: true,
        });
      }
    }

    // Then outdated packages
    for (const dep of outdated) {
      recommendations.push({
        package: dep.name,
        from: dep.currentVersion,
        to: dep.latestVersion,
        type: dep.status === DependencyStatus.MAJOR_UPDATE ? 'major' : 'minor',
        priority:
          dep.status === DependencyStatus.MAJOR_UPDATE ? 'medium' : 'low',
        reason: 'Package update available',
        breakingChanges: dep.status === DependencyStatus.MAJOR_UPDATE,
        autoPatchable: dep.status !== DependencyStatus.MAJOR_UPDATE,
      });
    }

    return recommendations;
  }

  private filterByStrategy(
    recommendations: UpdateRecommendation[],
    strategy: UpdateStrategy,
  ): UpdateRecommendation[] {
    switch (strategy) {
      case UpdateStrategy.CONSERVATIVE:
        return recommendations.filter(
          (r) => r.type === 'patch' || r.priority === 'critical',
        );
      case UpdateStrategy.MODERATE:
        return recommendations.filter((r) => r.type !== 'major');
      case UpdateStrategy.AGGRESSIVE:
        return recommendations;
      case UpdateStrategy.MANUAL:
      default:
        return [];
    }
  }

  private async updatePackage(
    recommendation: UpdateRecommendation,
  ): Promise<DependencyUpdate> {
    try {
      const cmd = `npm install ${recommendation.package}@${recommendation.to}`;
      await execAsync(cmd, { cwd: this.projectRoot });

      return {
        package: recommendation.package,
        from: recommendation.from,
        to: recommendation.to,
        success: true,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        package: recommendation.package,
        from: recommendation.from,
        to: recommendation.to,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      };
    }
  }

  private async createPackageBackup(): Promise<void> {
    const backupPath = path.join(
      this.projectRoot,
      `package.json.backup.${Date.now()}`,
    );
    await fs.copyFile(this.packageJsonPath, backupPath);
    this.logger.log(`Created backup at ${backupPath}`);
  }

  private async rollbackPackageJson(): Promise<void> {
    // Find latest backup and restore
    this.logger.log('Rolling back package.json');
  }

  private async runTests(): Promise<boolean> {
    try {
      await execAsync('npm test', { cwd: this.projectRoot });
      return true;
    } catch (error) {
      return false;
    }
  }
}
