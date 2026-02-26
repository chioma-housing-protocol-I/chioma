export enum RefactoringType {
  EXTRACT_METHOD = 'extract_method',
  EXTRACT_CLASS = 'extract_class',
  RENAME_VARIABLE = 'rename_variable',
  REMOVE_DUPLICATION = 'remove_duplication',
  SIMPLIFY_CONDITIONAL = 'simplify_conditional',
  IMPROVE_ERROR_HANDLING = 'improve_error_handling',
  ADD_TYPE_ANNOTATIONS = 'add_type_annotations',
  OPTIMIZE_IMPORTS = 'optimize_imports',
  CONSOLIDATE_CONDITIONAL = 'consolidate_conditional',
  REPLACE_MAGIC_NUMBERS = 'replace_magic_numbers',
}

export enum RefactoringPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum RefactoringStatus {
  SUGGESTED = 'suggested',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
  FAILED = 'failed',
}

export interface RefactoringOpportunity {
  id: string;
  type: RefactoringType;
  priority: RefactoringPriority;
  title: string;
  description: string;
  filePath: string;
  lineRange?: { start: number; end: number };
  reason: string;
  benefits: string[];
  estimatedEffort: string;
  autoApplicable: boolean;
  affectedFiles?: string[];
  riskLevel: 'low' | 'medium' | 'high';
  suggestion?: {
    before: string;
    after: string;
  };
}

export interface RefactoringResult {
  opportunityId: string;
  status: RefactoringStatus;
  appliedAt?: number;
  filesModified?: string[];
  linesChanged?: number;
  error?: string;
  rollbackAvailable: boolean;
}

export interface RefactoringPlan {
  id: string;
  opportunities: RefactoringOpportunity[];
  priority: RefactoringPriority;
  estimatedTotalEffort: string;
  expectedImpact: {
    qualityScoreImprovement: number;
    complexityReduction: number;
    maintainabilityImprovement: number;
  };
  risks: string[];
  createdAt: number;
}

export interface CodePattern {
  id: string;
  name: string;
  description: string;
  occurrences: number;
  locations: Array<{
    filePath: string;
    lineRange: { start: number; end: number };
  }>;
  shouldRefactor: boolean;
  refactoringType?: RefactoringType;
}

export interface DuplicateCode {
  id: string;
  hash: string;
  lineCount: number;
  occurrences: Array<{
    filePath: string;
    lineRange: { start: number; end: number };
    snippet: string;
  }>;
  severity: 'high' | 'medium' | 'low';
  suggestedAction: string;
}

export interface ApplyRefactoringDto {
  opportunityId: string;
  autoConfirm?: boolean;
  createBackup?: boolean;
  runTests?: boolean;
}
