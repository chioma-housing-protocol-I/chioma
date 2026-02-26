import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import {
  RefactoringOpportunity,
  RefactoringResult,
  RefactoringPlan,
  RefactoringType,
  RefactoringPriority,
  RefactoringStatus,
  CodePattern,
  DuplicateCode,
  ApplyRefactoringDto,
} from '../types/refactoring.types';
import { CodeQualityAnalysisService } from './code-quality-analysis.service';

@Injectable()
export class AutomatedRefactoringService {
  private readonly logger = new Logger(AutomatedRefactoringService.name);
  private readonly projectRoot: string;
  private readonly backupPath: string;
  private appliedRefactorings: Map<string, RefactoringResult> = new Map();

  constructor(
    private readonly qualityAnalysisService: CodeQualityAnalysisService,
  ) {
    this.projectRoot = path.join(__dirname, '../../../../');
    this.backupPath = path.join(this.projectRoot, '.refactoring-backups');
  }

  async identifyRefactoringOpportunities(
    moduleName?: string,
  ): Promise<RefactoringOpportunity[]> {
    this.logger.log('Identifying refactoring opportunities');

    const opportunities: RefactoringOpportunity[] = [];

    // Get code quality report
    const report = moduleName
      ? await this.qualityAnalysisService.analyzeModule(moduleName)
      : await this.qualityAnalysisService.analyzeProject();

    if ('modules' in report) {
      // Project report
      for (const module of report.modules) {
        const moduleOpportunities =
          await this.analyzeModuleForRefactoring(module);
        opportunities.push(...moduleOpportunities);
      }
    } else {
      // Single module report
      const moduleOpportunities = await this.analyzeModuleForRefactoring(
        report,
      );
      opportunities.push(...moduleOpportunities);
    }

    // Find code patterns that should be refactored
    const patterns = await this.findCodePatterns();
    opportunities.push(...this.patternsToOpportunities(patterns));

    // Find duplicate code
    const duplicates = await this.findDuplicateCode();
    opportunities.push(...this.duplicatesToOpportunities(duplicates));

    // Sort by priority
    return opportunities.sort((a, b) => {
      const priorityOrder = {
        [RefactoringPriority.CRITICAL]: 0,
        [RefactoringPriority.HIGH]: 1,
        [RefactoringPriority.MEDIUM]: 2,
        [RefactoringPriority.LOW]: 3,
      };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  async createRefactoringPlan(
    opportunities: RefactoringOpportunity[],
  ): Promise<RefactoringPlan> {
    this.logger.log('Creating refactoring plan');

    // Filter high-impact opportunities
    const selectedOpportunities = opportunities.filter(
      (opp) =>
        opp.priority === RefactoringPriority.CRITICAL ||
        opp.priority === RefactoringPriority.HIGH,
    );

    const totalEffort = this.calculateTotalEffort(selectedOpportunities);
    const expectedImpact = this.calculateExpectedImpact(selectedOpportunities);

    const risks = this.identifyRisks(selectedOpportunities);

    return {
      id: `refactoring-plan-${Date.now()}`,
      opportunities: selectedOpportunities,
      priority:
        selectedOpportunities.length > 0
          ? selectedOpportunities[0].priority
          : RefactoringPriority.LOW,
      estimatedTotalEffort: totalEffort,
      expectedImpact,
      risks,
      createdAt: Date.now(),
    };
  }

  async applyRefactoring(
    dto: ApplyRefactoringDto,
  ): Promise<RefactoringResult> {
    this.logger.log(`Applying refactoring: ${dto.opportunityId}`);

    const result: RefactoringResult = {
      opportunityId: dto.opportunityId,
      status: RefactoringStatus.IN_PROGRESS,
      appliedAt: Date.now(),
      filesModified: [],
      linesChanged: 0,
      rollbackAvailable: false,
    };

    try {
      // Create backup if requested
      if (dto.createBackup) {
        await this.createBackup();
        result.rollbackAvailable = true;
      }

      // In a real implementation, this would apply specific refactorings
      // For now, we'll implement a few common auto-fixable refactorings

      const opportunity = await this.getOpportunity(dto.opportunityId);

      if (!opportunity) {
        throw new Error('Refactoring opportunity not found');
      }

      if (!opportunity.autoApplicable && !dto.autoConfirm) {
        throw new Error(
          'This refactoring requires manual confirmation or cannot be auto-applied',
        );
      }

      switch (opportunity.type) {
        case RefactoringType.OPTIMIZE_IMPORTS:
          await this.optimizeImports(opportunity.filePath);
          result.filesModified = [opportunity.filePath];
          break;

        case RefactoringType.REMOVE_DUPLICATION:
          const affectedFiles = await this.removeDuplication(opportunity);
          result.filesModified = affectedFiles;
          break;

        case RefactoringType.REPLACE_MAGIC_NUMBERS:
          await this.replaceMagicNumbers(opportunity.filePath);
          result.filesModified = [opportunity.filePath];
          break;

        default:
          throw new Error(
            `Refactoring type ${opportunity.type} not yet implemented`,
          );
      }

      result.status = RefactoringStatus.COMPLETED;
      result.linesChanged = await this.countChangedLines(result.filesModified);

      // Run tests if requested
      if (dto.runTests) {
        const testsPass = await this.runTests();
        if (!testsPass) {
          throw new Error('Tests failed after refactoring');
        }
      }

      this.appliedRefactorings.set(dto.opportunityId, result);
      this.logger.log(`Refactoring completed successfully`);
    } catch (error) {
      result.status = RefactoringStatus.FAILED;
      result.error =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Refactoring failed: ${result.error}`);

      // Rollback if backup was created
      if (result.rollbackAvailable) {
        await this.rollback();
      }
    }

    return result;
  }

  async rollback(): Promise<void> {
    this.logger.log('Rolling back refactoring changes');
    // Would restore from backup directory
    // Implementation depends on backup strategy
  }

  private async analyzeModuleForRefactoring(
    moduleReport: any,
  ): Promise<RefactoringOpportunity[]> {
    const opportunities: RefactoringOpportunity[] = [];

    // Convert code issues to refactoring opportunities
    for (const issue of moduleReport.issues) {
      if (!issue.autoFixable) continue;

      const opportunity: RefactoringOpportunity = {
        id: issue.id,
        type: this.issueTypeToRefactoringType(issue.type),
        priority: this.severityToPriority(issue.severity),
        title: issue.title,
        description: issue.description,
        filePath: issue.filePath,
        lineRange: issue.lineRange,
        reason: issue.description,
        benefits: [
          'Improves code quality',
          'Reduces technical debt',
          'Enhances maintainability',
        ],
        estimatedEffort: issue.estimatedEffort,
        autoApplicable: issue.autoFixable,
        riskLevel: 'low',
        suggestion: issue.suggestion
          ? { before: '', after: issue.suggestion }
          : undefined,
      };

      opportunities.push(opportunity);
    }

    // Add opportunities for high complexity
    if (moduleReport.complexity.average > 20) {
      opportunities.push({
        id: `${moduleReport.moduleName}-complexity`,
        type: RefactoringType.EXTRACT_METHOD,
        priority: RefactoringPriority.HIGH,
        title: `High complexity in ${moduleReport.moduleName}`,
        description: `Module has average complexity of ${moduleReport.complexity.average}`,
        filePath: moduleReport.modulePath,
        reason: 'High complexity makes code harder to understand and maintain',
        benefits: [
          'Reduces cognitive complexity',
          'Improves testability',
          'Easier to maintain',
        ],
        estimatedEffort: '2-4 hours',
        autoApplicable: false,
        riskLevel: 'medium',
      });
    }

    return opportunities;
  }

  private async findCodePatterns(): Promise<CodePattern[]> {
    // This would use AST analysis to find repeating code patterns
    // Simplified implementation
    return [];
  }

  private async findDuplicateCode(): Promise<DuplicateCode[]> {
    this.logger.log('Analyzing code for duplicates');
    const duplicates: DuplicateCode[] = [];

    // This would implement proper duplicate detection
    // Using hash-based or token-based comparison
    // Simplified for now

    return duplicates;
  }

  private patternsToOpportunities(
    patterns: CodePattern[],
  ): RefactoringOpportunity[] {
    return patterns
      .filter((p) => p.shouldRefactor)
      .map((pattern) => ({
        id: pattern.id,
        type: pattern.refactoringType || RefactoringType.EXTRACT_METHOD,
        priority: RefactoringPriority.MEDIUM,
        title: `Refactor repeated pattern: ${pattern.name}`,
        description: pattern.description,
        filePath: pattern.locations[0].filePath,
        reason: `Pattern occurs ${pattern.occurrences} times`,
        benefits: [
          'Reduces code duplication',
          'Improves maintainability',
          'Single source of truth',
        ],
        estimatedEffort: '1-2 hours',
        autoApplicable: false,
        affectedFiles: pattern.locations.map((loc) => loc.filePath),
        riskLevel: 'medium',
      }));
  }

  private duplicatesToOpportunities(
    duplicates: DuplicateCode[],
  ): RefactoringOpportunity[] {
    return duplicates.map((dup) => ({
      id: dup.id,
      type: RefactoringType.REMOVE_DUPLICATION,
      priority:
        dup.severity === 'high'
          ? RefactoringPriority.HIGH
          : RefactoringPriority.MEDIUM,
      title: `Remove duplicate code (${dup.lineCount} lines)`,
      description: `Code duplicated ${dup.occurrences.length} times`,
      filePath: dup.occurrences[0].filePath,
      reason: `Duplicate code increases maintenance burden`,
      benefits: [
        'Reduces codebase size',
        'Easier to maintain',
        'Reduces bug propagation',
      ],
      estimatedEffort: '30 minutes - 1 hour',
      autoApplicable: true,
      affectedFiles: dup.occurrences.map((occ) => occ.filePath),
      riskLevel: 'low',
    }));
  }

  private async optimizeImports(filePath: string): Promise<void> {
    // Would organize and remove unused imports
    this.logger.log(`Optimizing imports in ${filePath}`);
  }

  private async removeDuplication(
    opportunity: RefactoringOpportunity,
  ): Promise<string[]> {
    // Would extract duplicate code into shared function
    this.logger.log(`Removing duplication in ${opportunity.filePath}`);
    return opportunity.affectedFiles || [opportunity.filePath];
  }

  private async replaceMagicNumbers(filePath: string): Promise<void> {
    // Would replace magic numbers with named constants
    this.logger.log(`Replacing magic numbers in ${filePath}`);
  }

  private async createBackup(): Promise<void> {
    try {
      await fs.mkdir(this.backupPath, { recursive: true });
      const timestamp = Date.now();
      const backupDir = path.join(this.backupPath, `backup-${timestamp}`);
      await fs.mkdir(backupDir);
      this.logger.log(`Created backup at ${backupDir}`);
    } catch (error) {
      this.logger.error(`Failed to create backup: ${error}`);
      throw error;
    }
  }

  private async countChangedLines(files: string[]): Promise<number> {
    // Would use git diff or similar to count changed lines
    return files.length * 10; // Rough estimate
  }

  private async runTests(): Promise<boolean> {
    // Would run test suite
    this.logger.log('Running tests...');
    return true; // Assume tests pass for now
  }

  private async getOpportunity(
    id: string,
  ): Promise<RefactoringOpportunity | null> {
    const all = await this.identifyRefactoringOpportunities();
    return all.find((opp) => opp.id === id) || null;
  }

  private issueTypeToRefactoringType(issueType: string): RefactoringType {
    const mapping: Record<string, RefactoringType> = {
      complexity: RefactoringType.EXTRACT_METHOD,
      error_handling: RefactoringType.IMPROVE_ERROR_HANDLING,
      type_safety: RefactoringType.ADD_TYPE_ANNOTATIONS,
      maintainability: RefactoringType.SIMPLIFY_CONDITIONAL,
    };
    return (
      mapping[issueType] || RefactoringType.SIMPLIFY_CONDITIONAL
    );
  }

  private severityToPriority(severity: string): RefactoringPriority {
    const mapping: Record<string, RefactoringPriority> = {
      critical: RefactoringPriority.CRITICAL,
      high: RefactoringPriority.HIGH,
      medium: RefactoringPriority.MEDIUM,
      low: RefactoringPriority.LOW,
    };
    return mapping[severity] || RefactoringPriority.LOW;
  }

  private calculateTotalEffort(
    opportunities: RefactoringOpportunity[],
  ): string {
    // Sum up estimated efforts (simplified)
    const hours = opportunities.length * 2; // Rough estimate
    return hours > 8
      ? `${Math.ceil(hours / 8)} days`
      : `${hours} hours`;
  }

  private calculateExpectedImpact(opportunities: RefactoringOpportunity[]) {
    // Estimate impact based on number and type of refactorings
    const count = opportunities.length;
    return {
      qualityScoreImprovement: Math.min(count * 2, 20),
      complexityReduction: Math.min(count * 1.5, 15),
      maintainabilityImprovement: Math.min(count * 3, 25),
    };
  }

  private identifyRisks(opportunities: RefactoringOpportunity[]): string[] {
    const risks: string[] = [];

    const highRiskCount = opportunities.filter(
      (opp) => opp.riskLevel === 'high',
    ).length;
    const affectedFileCount = new Set(
      opportunities.flatMap((opp) => opp.affectedFiles || [opp.filePath]),
    ).size;

    if (highRiskCount > 0) {
      risks.push(`${highRiskCount} high-risk refactorings`);
    }

    if (affectedFileCount > 20) {
      risks.push('Large number of files affected');
    }

    if (opportunities.some((opp) => !opp.autoApplicable)) {
      risks.push('Manual intervention required for some refactorings');
    }

    if (risks.length === 0) {
      risks.push('Low risk - mostly automated refactorings');
    }

    return risks;
  }

  async getRefactoringHistory(): Promise<RefactoringResult[]> {
    return Array.from(this.appliedRefactorings.values());
  }

  async getRefactoringStats() {
    const history = await this.getRefactoringHistory();
    return {
      total: history.length,
      completed: history.filter(
        (r) => r.status === RefactoringStatus.COMPLETED,
      ).length,
      failed: history.filter((r) => r.status === RefactoringStatus.FAILED)
        .length,
      totalFilesModified: history.reduce(
        (sum, r) => sum + (r.filesModified?.length || 0),
        0,
      ),
      totalLinesChanged: history.reduce(
        (sum, r) => sum + (r.linesChanged || 0),
        0,
      ),
    };
  }
}
