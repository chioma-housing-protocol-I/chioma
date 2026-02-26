import { Test, TestingModule } from '@nestjs/testing';
import { DependencyManagementService } from '../services/dependency-management.service';
import {
  DependencyStatus,
  VulnerabilitySeverity,
  UpdateStrategy,
} from '../types/dependency.types';

describe('DependencyManagementService', () => {
  let service: DependencyManagementService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DependencyManagementService],
    }).compile();

    service = module.get<DependencyManagementService>(DependencyManagementService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('analyzeDependencies', () => {
    it('should return comprehensive dependency report', async () => {
      const report = await service.analyzeDependencies();

      expect(report).toBeDefined();
      expect(report.timestamp).toBeDefined();
      expect(report.totalDependencies).toBeGreaterThan(0);
      expect(report.dependencies).toBeInstanceOf(Array);
      expect(report.vulnerabilities).toBeInstanceOf(Array);
      expect(report.outdated).toBeInstanceOf(Array);
      expect(report.summary).toBeDefined();
      expect(report.updateRecommendations).toBeInstanceOf(Array);
    });

    it('should categorize dependencies by type', async () => {
      const report = await service.analyzeDependencies();

      report.dependencies.forEach((dep) => {
        expect(['dependencies', 'devDependencies', 'peerDependencies']).toContain(
          dep.type,
        );
      });
    });

    it('should identify dependency status', async () => {
      const report = await service.analyzeDependencies();

      report.dependencies.forEach((dep) => {
        expect(Object.values(DependencyStatus)).toContain(dep.status);
      });
    });
  });

  describe('checkVulnerabilities', () => {
    it('should check for security vulnerabilities', async () => {
      const vulnerabilities = await service.checkVulnerabilities();

      expect(vulnerabilities).toBeInstanceOf(Array);
      vulnerabilities.forEach((vuln) => {
        expect(vuln.id).toBeDefined();
        expect(vuln.severity).toBeDefined();
        expect(vuln.affectedPackage).toBeDefined();
        expect(Object.values(VulnerabilitySeverity)).toContain(vuln.severity);
      });
    });

    it('should prioritize critical vulnerabilities', async () => {
      const vulnerabilities = await service.checkVulnerabilities();
      
      const criticalVulns = vulnerabilities.filter(
        (v) => v.severity === VulnerabilitySeverity.CRITICAL,
      );

      criticalVulns.forEach((vuln) => {
        expect(vuln.title).toBeDefined();
        expect(vuln.description).toBeDefined();
        expect(vuln.references).toBeInstanceOf(Array);
      });
    });

    it('should include patched versions when available', async () => {
      const vulnerabilities = await service.checkVulnerabilities();

      vulnerabilities.forEach((vuln) => {
        if (vuln.patchedVersion) {
          expect(typeof vuln.patchedVersion).toBe('string');
        }
      });
    });
  });

  describe('checkOutdatedPackages', () => {
    it('should identify outdated packages', async () => {
      const outdated = await service.checkOutdatedPackages();

      expect(outdated).toBeInstanceOf(Array);
      outdated.forEach((dep) => {
        expect(dep.name).toBeDefined();
        expect(dep.currentVersion).toBeDefined();
        expect(dep.latestVersion).toBeDefined();
        expect(dep.currentVersion).not.toBe(dep.latestVersion);
      });
    });

    it('should distinguish between minor and major updates', async () => {
      const outdated = await service.checkOutdatedPackages();

      outdated.forEach((dep) => {
        expect([
          DependencyStatus.MINOR_UPDATE,
          DependencyStatus.MAJOR_UPDATE,
        ]).toContain(dep.status);
      });
    });
  });

  describe('performFullAnalysis', () => {
    it('should perform comprehensive analysis', async () => {
      const analysis = await service.performFullAnalysis();

      expect(analysis).toBeDefined();
      expect(analysis.sizeAnalysis).toBeDefined();
      expect(analysis.unusedDependencies).toBeInstanceOf(Array);
      expect(analysis.duplicateDependencies).toBeInstanceOf(Array);
      expect(analysis.licenseIssues).toBeInstanceOf(Array);
      expect(analysis.peerDependencyIssues).toBeInstanceOf(Array);
    });

    it('should identify unused dependencies', async () => {
      const analysis = await service.performFullAnalysis();

      expect(analysis.unusedDependencies).toBeInstanceOf(Array);
      analysis.unusedDependencies.forEach((dep) => {
        expect(typeof dep).toBe('string');
      });
    });

    it('should find duplicate dependencies', async () => {
      const analysis = await service.performFullAnalysis();

      analysis.duplicateDependencies.forEach((dup) => {
        expect(dup.name).toBeDefined();
        expect(dup.versions).toBeInstanceOf(Array);
        expect(dup.versions.length).toBeGreaterThan(1);
      });
    });
  });

  describe('Update recommendations', () => {
    it('should generate update recommendations', async () => {
      const report = await service.analyzeDependencies();

      report.updateRecommendations.forEach((rec) => {
        expect(rec.package).toBeDefined();
        expect(rec.from).toBeDefined();
        expect(rec.to).toBeDefined();
        expect(['patch', 'minor', 'major']).toContain(rec.type);
        expect(['critical', 'high', 'medium', 'low']).toContain(rec.priority);
      });
    });

    it('should prioritize security updates', async () => {
      const report = await service.analyzeDependencies();

      const securityUpdates = report.updateRecommendations.filter(
        (rec) => rec.priority === 'critical',
      );

      securityUpdates.forEach((rec) => {
        expect(rec.reason).toContain('vulnerability');
      });
    });
  });

  describe('Update strategies', () => {
    it('should support conservative update strategy', async () => {
      const options = {
        strategy: UpdateStrategy.CONSERVATIVE,
        runTests: false,
        createBackup: false,
      };

      const updates = await service.updateDependencies(options);
      expect(updates).toBeInstanceOf(Array);
    });

    it('should support moderate update strategy', async () => {
      const options = {
        strategy: UpdateStrategy.MODERATE,
        runTests: false,
        createBackup: false,
      };

      const updates = await service.updateDependencies(options);
      expect(updates).toBeInstanceOf(Array);
    });

    it('should support aggressive update strategy', async () => {
      const options = {
        strategy: UpdateStrategy.AGGRESSIVE,
        runTests: false,
        createBackup: false,
      };

      const updates = await service.updateDependencies(options);
      expect(updates).toBeInstanceOf(Array);
    });
  });

  describe('Summary statistics', () => {
    it('should calculate accurate summary', async () => {
      const report = await service.analyzeDependencies();

      const { summary } = report;
      expect(summary.upToDate).toBeGreaterThanOrEqual(0);
      expect(summary.minorUpdates).toBeGreaterThanOrEqual(0);
      expect(summary.majorUpdates).toBeGreaterThanOrEqual(0);
      expect(summary.critical).toBeGreaterThanOrEqual(0);
      expect(summary.high).toBeGreaterThanOrEqual(0);
      expect(summary.moderate).toBeGreaterThanOrEqual(0);
      expect(summary.low).toBeGreaterThanOrEqual(0);

      // Verify totals make sense
      const totalCategorized = 
        summary.upToDate + summary.minorUpdates + summary.majorUpdates;
      expect(totalCategorized).toBeLessThanOrEqual(report.totalDependencies);
    });
  });
});
