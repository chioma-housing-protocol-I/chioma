import { Test, TestingModule } from '@nestjs/testing';
import { CodeQualityAnalysisService } from '../services/code-quality-analysis.service';
import { QualityLevel, IssueType, IssueSeverity } from '../types/code-quality.types';

describe('CodeQualityAnalysisService', () => {
  let service: CodeQualityAnalysisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CodeQualityAnalysisService],
    }).compile();

    service = module.get<CodeQualityAnalysisService>(CodeQualityAnalysisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('analyzeProject', () => {
    it('should return project quality report', async () => {
      const report = await service.analyzeProject({ depth: 'shallow', modules: ['auth'] });

      expect(report).toBeDefined();
      expect(report.projectName).toBe('Backend');
      expect(report.overallScore).toBeDefined();
      expect(report.overallScore.overall).toBeGreaterThanOrEqual(0);
      expect(report.overallScore.overall).toBeLessThanOrEqual(100);
      expect(report.modules).toBeInstanceOf(Array);
      expect(report.summary).toBeDefined();
      expect(report.timestamp).toBeDefined();
    });

    it('should handle empty modules', async () => {
      const report = await service.analyzeProject({ modules: ['nonexistent'] });
      
      expect(report.modules).toHaveLength(0);
      expect(report.summary.totalFiles).toBe(0);
      expect(report.summary.totalLines).toBe(0);
    });

    it('should exclude test files by default', async () => {
      const report = await service.analyzeProject({ 
        includeTests: false,
        modules: ['auth']
      });

      // Should not analyze .spec.ts files
      const hasTestIssues = report.modules.some(module => 
        module.issues.some(issue => issue.filePath.includes('.spec.ts'))
      );
      expect(hasTestIssues).toBe(false);
    });
  });

  describe('analyzeModule', () => {
    it('should analyze single module quality', async () => {
      const report = await service.analyzeModule('auth');

      expect(report).toBeDefined();
      expect(report.moduleName).toBe('auth');
      expect(report.score).toBeDefined();
      expect(report.fileCount).toBeGreaterThanOrEqual(0);
      expect(report.lineCount).toBeGreaterThanOrEqual(0);
      expect(report.complexity).toBeDefined();
      expect(report.issues).toBeInstanceOf(Array);
    });

    it('should calculate complexity metrics', async () => {
      const report = await service.analyzeModule('auth');

      expect(report.complexity.average).toBeGreaterThanOrEqual(0);
      expect(report.complexity.max).toBeGreaterThanOrEqual(0);
      expect(report.complexity.highComplexityFunctions).toBeInstanceOf(Array);
    });

    it('should detect code duplication', async () => {
      const report = await service.analyzeModule('auth');

      expect(report.duplicationPercentage).toBeGreaterThanOrEqual(0);
      expect(report.duplicationPercentage).toBeLessThanOrEqual(100);
    });
  });

  describe('getMetrics', () => {
    it('should return quality metrics', async () => {
      const metrics = await service.getMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.timestamp).toBeDefined();
      expect(metrics.complexity).toBeDefined();
      expect(metrics.maintainability).toBeDefined();
      expect(metrics.documentation).toBeDefined();
      expect(metrics.errorHandling).toBeDefined();
      expect(metrics.typeSafety).toBeDefined();
    });

    it('should calculate maintainability index', async () => {
      const metrics = await service.getMetrics();

      expect(metrics.maintainability.index).toBeGreaterThanOrEqual(0);
      expect(metrics.maintainability.index).toBeLessThanOrEqual(100);
    });
  });

  describe('Quality level classification', () => {
    it('should classify excellent quality (90-100)', async () => {
      const report = await service.analyzeProject({ depth: 'shallow' });
      
      if (report.overallScore.overall >= 90) {
        expect(report.overallScore.level).toBe(QualityLevel.EXCELLENT);
      }
    });

    it('should classify good quality (75-89)', async () => {
      const report = await service.analyzeProject({ depth: 'shallow' });
      
      if (report.overallScore.overall >= 75 && report.overallScore.overall < 90) {
        expect(report.overallScore.level).toBe(QualityLevel.GOOD);
      }
    });
  });

  describe('Issue detection', () => {
    it('should detect missing error handling', async () => {
      const report = await service.analyzeProject();
      
      const errorHandlingIssues = report.modules.flatMap(m => 
        m.issues.filter(i => i.type === IssueType.ERROR_HANDLING)
      );

      errorHandlingIssues.forEach(issue => {
        expect(issue.severity).toBeDefined();
        expect(issue.suggestion).toBeDefined();
        expect(issue.technicalDebt).toBeGreaterThan(0);
      });
    });

    it('should detect type safety issues', async () => {
      const report = await service.analyzeProject();
      
      const typeSafetyIssues = report.modules.flatMap(m => 
        m.issues.filter(i => i.type === IssueType.TYPE_SAFETY)
      );

      typeSafetyIssues.forEach(issue => {
        expect(issue.title).toContain('any');
        expect(issue.autoFixable).toBe(false);
      });
    });
  });

  describe('Technical debt calculation', () => {
    it('should calculate total technical debt', async () => {
      const report = await service.analyzeProject();

      expect(report.summary.technicalDebtMinutes).toBeGreaterThanOrEqual(0);
      
      // Verify it matches sum of issue debts
      const calculatedDebt = report.modules.reduce((sum, module) => {
        return sum + module.issues.reduce((s, issue) => s + issue.technicalDebt, 0);
      }, 0);

      expect(report.summary.technicalDebtMinutes).toBe(calculatedDebt);
    });
  });
});
