import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import {
  CodeQualityScore,
  CodeIssue,
  ModuleQualityReport,
  ProjectQualityReport,
  AnalysisOptions,
  IssueType,
  IssueSeverity,
  QualityLevel,
  CodeQualityMetric,
  QualityMetrics,
} from '../types/code-quality.types';

@Injectable()
export class CodeQualityAnalysisService {
  private readonly logger = new Logger(CodeQualityAnalysisService.name);
  private readonly projectRoot: string;
  private readonly srcPath: string;

  constructor() {
    this.projectRoot = path.join(__dirname, '../../../../');
    this.srcPath = path.join(this.projectRoot, 'src');
  }

  async analyzeProject(
    options: AnalysisOptions = {},
  ): Promise<ProjectQualityReport> {
    this.logger.log('Starting project-wide code quality analysis');

    const defaults: AnalysisOptions = {
      includeTests: false,
      includeDocs: false,
      excludePatterns: ['node_modules', 'dist', 'coverage'],
      depth: 'normal',
    };

    const opts = { ...defaults, ...options };

    const modulesPath = path.join(this.srcPath, 'modules');
    const moduleNames = await this.getModules(modulesPath, opts);

    const moduleReports: ModuleQualityReport[] = [];
    let totalFiles = 0;
    let totalLines = 0;
    let totalIssues = 0;
    let criticalIssues = 0;
    let highIssues = 0;
    let technicalDebtMinutes = 0;

    for (const moduleName of moduleNames) {
      if (opts.modules && !opts.modules.includes(moduleName)) {
        continue;
      }

      const report = await this.analyzeModule(moduleName, opts);
      moduleReports.push(report);

      totalFiles += report.fileCount;
      totalLines += report.lineCount;
      totalIssues += report.issues.length;
      criticalIssues += report.issues.filter(
        (i) => i.severity === IssueSeverity.CRITICAL,
      ).length;
      highIssues += report.issues.filter(
        (i) => i.severity === IssueSeverity.HIGH,
      ).length;
      technicalDebtMinutes += report.issues.reduce(
        (sum, i) => sum + i.technicalDebt,
        0,
      );
    }

    const overallScore = this.calculateOverallScore(moduleReports);
    const duplicationPercentage = this.calculateProjectDuplication(
      moduleReports,
    );

    return {
      projectName: 'Backend',
      timestamp: Date.now(),
      overallScore,
      modules: moduleReports,
      summary: {
        totalFiles,
        totalLines,
        totalIssues,
        criticalIssues,
        highIssues,
        technicalDebtMinutes,
        duplicationPercentage,
      },
    };
  }

  async analyzeModule(
    moduleName: string,
    options: AnalysisOptions = {},
  ): Promise<ModuleQualityReport> {
    this.logger.log(`Analyzing module: ${moduleName}`);

    const modulePath = path.join(this.srcPath, 'modules', moduleName);
    const files = await this.getFiles(modulePath, options);

    let lineCount = 0;
    const issues: CodeIssue[] = [];
    const complexityData: number[] = [];
    const duplicates: Map<string, string[]> = new Map();

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const lines = content.split('\n');
      lineCount += lines.length;

      // Analyze file
      const fileIssues = await this.analyzeFile(file, content);
      issues.push(...fileIssues);

      // Calculate complexity
      const complexity = this.calculateFileComplexity(content);
      complexityData.push(complexity);

      // Check for duplicates
      const hash = this.generateContentHash(content);
      if (duplicates.has(hash)) {
        duplicates.get(hash)!.push(file);
      } else {
        duplicates.set(hash, [file]);
      }
    }

    const highComplexityFunctions = this.findHighComplexityFunctions(files);
    const duplicationPercentage = this.calculateDuplication(duplicates, files);

    const score = this.calculateModuleScore(
      issues,
      complexityData,
      duplicationPercentage,
      lineCount,
    );

    return {
      moduleName,
      modulePath,
      score,
      issues,
      fileCount: files.length,
      lineCount,
      complexity: {
        average:
          complexityData.reduce((a, b) => a + b, 0) / complexityData.length ||
          0,
        max: Math.max(...complexityData, 0),
        highComplexityFunctions,
      },
      duplicationPercentage,
    };
  }

  private async analyzeFile(
    filePath: string,
    content: string,
  ): Promise<CodeIssue[]> {
    const issues: CodeIssue[] = [];
    const lines = content.split('\n');

    // Check for missing error handling
    const hasAsync = /async\s+\w+/.test(content);
    const hasTryCatch = /try\s*{/.test(content);
    if (hasAsync && !hasTryCatch) {
      issues.push({
        id: `${filePath}-error-handling`,
        type: IssueType.ERROR_HANDLING,
        severity: IssueSeverity.HIGH,
        title: 'Missing error handling in async function',
        description: 'Async functions should have proper try-catch blocks',
        filePath,
        suggestion: 'Wrap async operations in try-catch blocks',
        autoFixable: false,
        estimatedEffort: '15 minutes',
        technicalDebt: 15,
      });
    }

    // Check for any type usage
    const anyMatches = content.match(/:\s*any[\s,;)]/g);
    if (anyMatches && anyMatches.length > 3) {
      issues.push({
        id: `${filePath}-type-safety`,
        type: IssueType.TYPE_SAFETY,
        severity: IssueSeverity.MEDIUM,
        title: `Excessive use of 'any' type (${anyMatches.length} occurrences)`,
        description: 'Using "any" type reduces type safety',
        filePath,
        suggestion: 'Replace "any" with specific types or interfaces',
        autoFixable: false,
        estimatedEffort: '30 minutes',
        technicalDebt: 30,
      });
    }

    // Check for large functions
    let currentFunctionStart = -1;
    let braceCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (/(function|=>|\s+\w+\s*\()/.test(line)) {
        currentFunctionStart = i;
        braceCount = 0;
      }

      if (currentFunctionStart >= 0) {
        braceCount += (line.match(/{/g) || []).length;
        braceCount -= (line.match(/}/g) || []).length;

        if (braceCount === 0 && currentFunctionStart >= 0) {
          const functionLength = i - currentFunctionStart;
          if (functionLength > 50) {
            issues.push({
              id: `${filePath}-complexity-${currentFunctionStart}`,
              type: IssueType.COMPLEXITY,
              severity: IssueSeverity.MEDIUM,
              title: 'Large function detected',
              description: `Function has ${functionLength} lines, exceeding recommended 50 lines`,
              filePath,
              lineRange: { start: currentFunctionStart + 1, end: i + 1 },
              suggestion: 'Consider breaking this function into smaller functions',
              autoFixable: false,
              estimatedEffort: '1 hour',
              technicalDebt: 60,
            });
          }
          currentFunctionStart = -1;
        }
      }
    }

    // Check for TODO/FIXME comments
    lines.forEach((line, index) => {
      if (/TODO|FIXME/i.test(line)) {
        issues.push({
          id: `${filePath}-todo-${index}`,
          type: IssueType.MAINTAINABILITY,
          severity: IssueSeverity.LOW,
          title: 'Unresolved TODO/FIXME comment',
          description: line.trim(),
          filePath,
          lineNumber: index + 1,
          suggestion: 'Resolve or track as a proper issue',
          autoFixable: false,
          estimatedEffort: '30 minutes',
          technicalDebt: 30,
        });
      }
    });

    // Check for console.log (should use Logger)
    if (/console\.(log|error|warn|info|debug)/.test(content)) {
      issues.push({
        id: `${filePath}-console-log`,
        type: IssueType.MAINTAINABILITY,
        severity: IssueSeverity.LOW,
        title: 'Using console.log instead of Logger',
        description: 'Should use NestJS Logger for consistency',
        filePath,
        suggestion: 'Replace console.log with this.logger.log()',
        autoFixable: true,
        estimatedEffort: '5 minutes',
        technicalDebt: 5,
      });
    }

    // Check for hardcoded values that should be config
    const urlPattern = /(https?:\/\/[^\s'"]+)/g;
    const urls = content.match(urlPattern);
    if (urls && urls.length > 0 && !filePath.includes('.spec.ts')) {
      issues.push({
        id: `${filePath}-hardcoded-url`,
        type: IssueType.MAINTAINABILITY,
        severity: IssueSeverity.MEDIUM,
        title: 'Hardcoded URLs detected',
        description: 'URLs should be in configuration',
        filePath,
        suggestion: 'Move URLs to environment variables or config service',
        autoFixable: false,
        estimatedEffort: '20 minutes',
        technicalDebt: 20,
      });
    }

    return issues;
  }

  private calculateFileComplexity(content: string): number {
    // Simplified cyclomatic complexity calculation
    let complexity = 1; // Base complexity

    // Count decision points
    complexity += (content.match(/if\s*\(/g) || []).length;
    complexity += (content.match(/else\s+if\s*\(/g) || []).length;
    complexity += (content.match(/\?\s*.*\s*:/g) || []).length; // Ternary
    complexity += (content.match(/for\s*\(/g) || []).length;
    complexity += (content.match(/while\s*\(/g) || []).length;
    complexity += (content.match(/case\s+/g) || []).length;
    complexity += (content.match(/catch\s*\(/g) || []).length;
    complexity += (content.match(/&&|\|\|/g) || []).length;

    return complexity;
  }

  private generateContentHash(content: string): string {
    // Simple hash for duplicate detection (not cryptographic)
    let hash = 0;
    const normalized = content
      .replace(/\s+/g, '')
      .replace(/\/\/.*/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');

    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    return hash.toString(36);
  }

  private findHighComplexityFunctions(files: string[]): string[] {
    // Placeholder - would need more sophisticated AST parsing
    return [];
  }

  private calculateDuplication(
    duplicates: Map<string, string[]>,
    files: string[],
  ): number {
    const duplicateFiles = Array.from(duplicates.values()).filter(
      (group) => group.length > 1,
    ).length;
    return files.length > 0 ? (duplicateFiles / files.length) * 100 : 0;
  }

  private calculateModuleScore(
    issues: CodeIssue[],
    complexityData: number[],
    duplicationPercentage: number,
    lineCount: number,
  ): CodeQualityScore {
    const criticalCount = issues.filter(
      (i) => i.severity === IssueSeverity.CRITICAL,
    ).length;
    const highCount = issues.filter(
      (i) => i.severity === IssueSeverity.HIGH,
    ).length;
    const mediumCount = issues.filter(
      (i) => i.severity === IssueSeverity.MEDIUM,
    ).length;

    // Calculate metric scores (0-100)
    const avgComplexity =
      complexityData.reduce((a, b) => a + b, 0) / complexityData.length || 0;
    const complexityScore = Math.max(0, 100 - avgComplexity * 2);
    const maintainabilityScore = Math.max(
      0,
      100 - criticalCount * 20 - highCount * 10 - mediumCount * 5,
    );
    const duplicationScore = Math.max(0, 100 - duplicationPercentage * 2);

    // Error handling score based on issues
    const errorHandlingIssues = issues.filter(
      (i) => i.type === IssueType.ERROR_HANDLING,
    ).length;
    const errorHandlingScore = Math.max(0, 100 - errorHandlingIssues * 10);

    // Type safety score
    const typeSafetyIssues = issues.filter(
      (i) => i.type === IssueType.TYPE_SAFETY,
    ).length;
    const typeSafetyScore = Math.max(0, 100 - typeSafetyIssues * 15);

    // Documentation score (simplified - would need proper analysis)
    const documentationScore = 70;

    // Test coverage score (placeholder - would integrate with coverage tool)
    const testCoverageScore = 75;

    // Calculate overall score (weighted average)
    const overall =
      complexityScore * 0.2 +
      maintainabilityScore * 0.25 +
      duplicationScore * 0.15 +
      testCoverageScore * 0.15 +
      documentationScore * 0.1 +
      errorHandlingScore * 0.1 +
      typeSafetyScore * 0.05;

    const level = this.getQualityLevel(overall);

    return {
      overall: Math.round(overall),
      metrics: {
        [CodeQualityMetric.COMPLEXITY]: Math.round(complexityScore),
        [CodeQualityMetric.MAINTAINABILITY]: Math.round(maintainabilityScore),
        [CodeQualityMetric.DUPLICATION]: Math.round(duplicationScore),
        [CodeQualityMetric.TEST_COVERAGE]: Math.round(testCoverageScore),
        [CodeQualityMetric.DOCUMENTATION]: Math.round(documentationScore),
        [CodeQualityMetric.ERROR_HANDLING]: Math.round(errorHandlingScore),
        [CodeQualityMetric.TYPE_SAFETY]: Math.round(typeSafetyScore),
      },
      level,
      timestamp: Date.now(),
    };
  }

  private calculateOverallScore(
    modules: ModuleQualityReport[],
  ): CodeQualityScore {
    if (modules.length === 0) {
      return this.getDefaultScore();
    }

    const avgMetrics = {
      [CodeQualityMetric.COMPLEXITY]: 0,
      [CodeQualityMetric.MAINTAINABILITY]: 0,
      [CodeQualityMetric.DUPLICATION]: 0,
      [CodeQualityMetric.TEST_COVERAGE]: 0,
      [CodeQualityMetric.DOCUMENTATION]: 0,
      [CodeQualityMetric.ERROR_HANDLING]: 0,
      [CodeQualityMetric.TYPE_SAFETY]: 0,
    };

    modules.forEach((module) => {
      Object.keys(avgMetrics).forEach((key) => {
        avgMetrics[key as CodeQualityMetric] +=
          module.score.metrics[key as CodeQualityMetric];
      });
    });

    Object.keys(avgMetrics).forEach((key) => {
      avgMetrics[key as CodeQualityMetric] /= modules.length;
    });

    const overall =
      modules.reduce((sum, m) => sum + m.score.overall, 0) / modules.length;

    return {
      overall: Math.round(overall),
      metrics: {
        [CodeQualityMetric.COMPLEXITY]: Math.round(
          avgMetrics[CodeQualityMetric.COMPLEXITY],
        ),
        [CodeQualityMetric.MAINTAINABILITY]: Math.round(
          avgMetrics[CodeQualityMetric.MAINTAINABILITY],
        ),
        [CodeQualityMetric.DUPLICATION]: Math.round(
          avgMetrics[CodeQualityMetric.DUPLICATION],
        ),
        [CodeQualityMetric.TEST_COVERAGE]: Math.round(
          avgMetrics[CodeQualityMetric.TEST_COVERAGE],
        ),
        [CodeQualityMetric.DOCUMENTATION]: Math.round(
          avgMetrics[CodeQualityMetric.DOCUMENTATION],
        ),
        [CodeQualityMetric.ERROR_HANDLING]: Math.round(
          avgMetrics[CodeQualityMetric.ERROR_HANDLING],
        ),
        [CodeQualityMetric.TYPE_SAFETY]: Math.round(
          avgMetrics[CodeQualityMetric.TYPE_SAFETY],
        ),
      },
      level: this.getQualityLevel(overall),
      timestamp: Date.now(),
    };
  }

  private calculateProjectDuplication(
    modules: ModuleQualityReport[],
  ): number {
    if (modules.length === 0) return 0;
    return (
      modules.reduce((sum, m) => sum + m.duplicationPercentage, 0) /
      modules.length
    );
  }

  private getQualityLevel(score: number): QualityLevel {
    if (score >= 90) return QualityLevel.EXCELLENT;
    if (score >= 75) return QualityLevel.GOOD;
    if (score >= 60) return QualityLevel.FAIR;
    if (score >= 40) return QualityLevel.POOR;
    return QualityLevel.CRITICAL;
  }

  private getDefaultScore(): CodeQualityScore {
    return {
      overall: 0,
      metrics: {
        [CodeQualityMetric.COMPLEXITY]: 0,
        [CodeQualityMetric.MAINTAINABILITY]: 0,
        [CodeQualityMetric.DUPLICATION]: 0,
        [CodeQualityMetric.TEST_COVERAGE]: 0,
        [CodeQualityMetric.DOCUMENTATION]: 0,
        [CodeQualityMetric.ERROR_HANDLING]: 0,
        [CodeQualityMetric.TYPE_SAFETY]: 0,
      },
      level: QualityLevel.CRITICAL,
      timestamp: Date.now(),
    };
  }

  private async getModules(
    modulesPath: string,
    options: AnalysisOptions,
  ): Promise<string[]> {
    try {
      const entries = await fs.readdir(modulesPath, { withFileTypes: true });
      return entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .filter((name) => !this.shouldExclude(name, options.excludePatterns));
    } catch (error) {
      this.logger.error(`Failed to read modules: ${error}`);
      return [];
    }
  }

  private async getFiles(
    dirPath: string,
    options: AnalysisOptions,
  ): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (this.shouldExclude(entry.name, options.excludePatterns)) {
          continue;
        }

        if (entry.isDirectory()) {
          const subFiles = await this.getFiles(fullPath, options);
          files.push(...subFiles);
        } else if (entry.isFile()) {
          if (
            entry.name.endsWith('.ts') &&
            (options.includeTests || !entry.name.includes('.spec.ts'))
          ) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      this.logger.error(`Failed to read directory ${dirPath}: ${error}`);
    }

    return files;
  }

  private shouldExclude(name: string, excludePatterns?: string[]): boolean {
    if (!excludePatterns) return false;
    return excludePatterns.some((pattern) => name.includes(pattern));
  }

  async getMetrics(): Promise<QualityMetrics> {
    const report = await this.analyzeProject();
    const avgComplexity =
      report.modules.reduce((sum, m) => sum + m.complexity.average, 0) /
        report.modules.length || 0;

    return {
      timestamp: Date.now(),
      complexity: {
        cyclomatic: avgComplexity,
        cognitive: avgComplexity * 1.2,
        averagePerFunction: avgComplexity / 5,
      },
      maintainability: {
        index: report.overallScore.overall,
        linesPerFile:
          report.summary.totalLines /
            Math.max(report.summary.totalFiles, 1) || 0,
        functionsPerFile: 8, // Estimated
      },
      documentation: {
        percentage:
          report.overallScore.metrics[CodeQualityMetric.DOCUMENTATION],
        missingDocs: [],
      },
      errorHandling: {
        score: report.overallScore.metrics[CodeQualityMetric.ERROR_HANDLING],
        uncaughtExceptions: report.modules.filter((m) =>
          m.issues.some((i) => i.type === IssueType.ERROR_HANDLING),
        ).length,
        missingTryCatch: [],
      },
      typeSafety: {
        score: report.overallScore.metrics[CodeQualityMetric.TYPE_SAFETY],
        anyUsage: report.modules.reduce(
          (sum, m) =>
            sum +
            m.issues.filter((i) => i.type === IssueType.TYPE_SAFETY).length,
          0,
        ),
        implicitAny: 0,
      },
    };
  }
}
