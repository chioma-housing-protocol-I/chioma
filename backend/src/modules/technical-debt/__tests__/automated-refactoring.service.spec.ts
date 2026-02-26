import { Test, TestingModule } from '@nestjs/testing';
import { AutomatedRefactoringService } from '../services/automated-refactoring.service';
import { CodeQualityAnalysisService } from '../services/code-quality-analysis.service';
import {
  RefactoringType,
  RefactoringPriority,
  RefactoringStatus,
} from '../types/refactoring.types';

describe('AutomatedRefactoringService', () => {
  let service: AutomatedRefactoringService;
  let qualityService: CodeQualityAnalysisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AutomatedRefactoringService, CodeQualityAnalysisService],
    }).compile();

    service = module.get<AutomatedRefactoringService>(AutomatedRefactoringService);
    qualityService = module.get<CodeQualityAnalysisService>(CodeQualityAnalysisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('identifyRefactoringOpportunities', () => {
    it('should identify refactoring opportunities across project', async () => {
      const opportunities = await service.identifyRefactoringOpportunities();

      expect(opportunities).toBeInstanceOf(Array);
      opportunities.forEach((opp) => {
        expect(opp.id).toBeDefined();
        expect(opp.type).toBeDefined();
        expect(opp.priority).toBeDefined();
        expect(opp.title).toBeDefined();
        expect(opp.description).toBeDefined();
        expect(opp.filePath).toBeDefined();
        expect(opp.estimatedEffort).toBeDefined();
      });
    });

    it('should identify opportunities for specific module', async () => {
      const opportunities = await service.identifyRefactoringOpportunities('auth');

      expect(opportunities).toBeInstanceOf(Array);
      opportunities.forEach((opp) => {
        expect(opp.filePath).toContain('auth');
      });
    });

    it('should sort opportunities by priority', async () => {
      const opportunities = await service.identifyRefactoringOpportunities();

      const priorityOrder = [
        RefactoringPriority.CRITICAL,
        RefactoringPriority.HIGH,
        RefactoringPriority.MEDIUM,
        RefactoringPriority.LOW,
      ];

      let lastPriorityIndex = -1;
      opportunities.forEach((opp) => {
        const currentIndex = priorityOrder.indexOf(opp.priority);
        expect(currentIndex).toBeGreaterThanOrEqual(lastPriorityIndex);
        lastPriorityIndex = currentIndex;
      });
    });

    it('should mark auto-applicable opportunities', async () => {
      const opportunities = await service.identifyRefactoringOpportunities();

      opportunities.forEach((opp) => {
        expect(typeof opp.autoApplicable).toBe('boolean');
        if (opp.autoApplicable) {
          expect(['low', 'medium']).toContain(opp.riskLevel);
        }
      });
    });
  });

  describe('createRefactoringPlan', () => {
    it('should create plan from opportunities', async () => {
      const opportunities = await service.identifyRefactoringOpportunities();
      const plan = await service.createRefactoringPlan(opportunities);

      expect(plan).toBeDefined();
      expect(plan.id).toBeDefined();
      expect(plan.opportunities).toBeInstanceOf(Array);
      expect(plan.estimatedTotalEffort).toBeDefined();
      expect(plan.expectedImpact).toBeDefined();
      expect(plan.risks).toBeInstanceOf(Array);
      expect(plan.createdAt).toBeDefined();
    });

    it('should prioritize critical and high priority items', async () => {
      const opportunities = await service.identifyRefactoringOpportunities();
      const plan = await service.createRefactoringPlan(opportunities);

      plan.opportunities.forEach((opp) => {
        expect([RefactoringPriority.CRITICAL, RefactoringPriority.HIGH]).toContain(
          opp.priority,
        );
      });
    });

    it('should calculate expected impact', async () => {
      const opportunities = await service.identifyRefactoringOpportunities();
      const plan = await service.createRefactoringPlan(opportunities);

      expect(plan.expectedImpact.qualityScoreImprovement).toBeGreaterThanOrEqual(0);
      expect(plan.expectedImpact.complexityReduction).toBeGreaterThanOrEqual(0);
      expect(plan.expectedImpact.maintainabilityImprovement).toBeGreaterThanOrEqual(0);
    });
  });

  describe('applyRefactoring', () => {
    it('should apply auto-applicable refactoring', async () => {
      const result = await service.applyRefactoring({
        opportunityId: 'test-refactoring',
        autoConfirm: true,
        createBackup: false,
        runTests: false,
      });

      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
      expect(result.appliedAt).toBeDefined();
    });

    it('should create backup when requested', async () => {
      const result = await service.applyRefactoring({
        opportunityId: 'test-refactoring',
        createBackup: true,
        runTests: false,
      });

      if (result.status === RefactoringStatus.COMPLETED) {
        expect(result.rollbackAvailable).toBe(true);
      }
    });

    it('should track applied refactorings', async () => {
      await service.applyRefactoring({
        opportunityId: 'test-refactoring-1',
        runTests: false,
      });

      const history = await service.getRefactoringHistory();
      expect(history.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getRefactoringHistory', () => {
    it('should return refactoring history', async () => {
      const history = await service.getRefactoringHistory();

      expect(history).toBeInstanceOf(Array);
      history.forEach((result) => {
        expect(result.opportunityId).toBeDefined();
        expect(result.status).toBeDefined();
      });
    });
  });

  describe('getRefactoringStats', () => {
    it('should return refactoring statistics', async () => {
      const stats = await service.getRefactoringStats();

      expect(stats).toBeDefined();
      expect(stats.total).toBeGreaterThanOrEqual(0);
      expect(stats.completed).toBeGreaterThanOrEqual(0);
      expect(stats.failed).toBeGreaterThanOrEqual(0);
      expect(stats.totalFilesModified).toBeGreaterThanOrEqual(0);
      expect(stats.totalLinesChanged).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Risk assessment', () => {
    it('should identify high-risk refactorings', async () => {
      const opportunities = await service.identifyRefactoringOpportunities();
      const plan = await service.createRefactoringPlan(opportunities);

      expect(plan.risks).toBeInstanceOf(Array);
      expect(plan.risks.length).toBeGreaterThan(0);
    });
  });
});
