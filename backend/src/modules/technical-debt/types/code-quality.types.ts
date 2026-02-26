export enum CodeQualityMetric {
  COMPLEXITY = 'complexity',
  MAINTAINABILITY = 'maintainability',
  DUPLICATION = 'duplication',
  TEST_COVERAGE = 'test_coverage',
  DOCUMENTATION = 'documentation',
  ERROR_HANDLING = 'error_handling',
  TYPE_SAFETY = 'type_safety',
}

export enum QualityLevel {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
  CRITICAL = 'critical',
}

export enum IssueType {
  COMPLEXITY = 'complexity',
  DUPLICATION = 'duplication',
  ERROR_HANDLING = 'error_handling',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  MAINTAINABILITY = 'maintainability',
  TYPE_SAFETY = 'type_safety',
}

export enum IssueSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info',
}

export interface CodeQualityScore {
  overall: number;
  metrics: {
    [CodeQualityMetric.COMPLEXITY]: number;
    [CodeQualityMetric.MAINTAINABILITY]: number;
    [CodeQualityMetric.DUPLICATION]: number;
    [CodeQualityMetric.TEST_COVERAGE]: number;
    [CodeQualityMetric.DOCUMENTATION]: number;
    [CodeQualityMetric.ERROR_HANDLING]: number;
    [CodeQualityMetric.TYPE_SAFETY]: number;
  };
  level: QualityLevel;
  timestamp: number;
}

export interface CodeIssue {
  id: string;
  type: IssueType;
  severity: IssueSeverity;
  title: string;
  description: string;
  filePath: string;
  lineNumber?: number;
  lineRange?: { start: number; end: number };
  suggestion?: string;
  autoFixable: boolean;
  estimatedEffort: string; // e.g., "5 minutes", "2 hours"
  technicalDebt: number; // in minutes
}

export interface ModuleQualityReport {
  moduleName: string;
  modulePath: string;
  score: CodeQualityScore;
  issues: CodeIssue[];
  fileCount: number;
  lineCount: number;
  complexity: {
    average: number;
    max: number;
    highComplexityFunctions: string[];
  };
  duplicationPercentage: number;
}

export interface ProjectQualityReport {
  projectName: string;
  timestamp: number;
  overallScore: CodeQualityScore;
  modules: ModuleQualityReport[];
  summary: {
    totalFiles: number;
    totalLines: number;
    totalIssues: number;
    criticalIssues: number;
    highIssues: number;
    technicalDebtMinutes: number;
    duplicationPercentage: number;
  };
  trends?: {
    scoreChange: number;
    issuesChange: number;
    debtChange: number;
  };
}

export interface AnalysisOptions {
  includeTests?: boolean;
  includeDocs?: boolean;
  excludePatterns?: string[];
  depth?: 'shallow' | 'normal' | 'deep';
  modules?: string[];
}

export interface QualityMetrics {
  timestamp: number;
  complexity: {
    cyclomatic: number;
    cognitive: number;
    averagePerFunction: number;
  };
  maintainability: {
    index: number; // 0-100
    linesPerFile: number;
    functionsPerFile: number;
  };
  documentation: {
    percentage: number;
    missingDocs: string[];
  };
  errorHandling: {
    score: number;
    uncaughtExceptions: number;
    missingTryCatch: string[];
  };
  typeSafety: {
    score: number;
    anyUsage: number;
    implicitAny: number;
  };
}
