export enum DependencyStatus {
  UP_TO_DATE = 'up_to_date',
  MINOR_UPDATE = 'minor_update',
  MAJOR_UPDATE = 'major_update',
  DEPRECATED = 'deprecated',
  VULNERABLE = 'vulnerable',
  UNUSED = 'unused',
}

export enum VulnerabilitySeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MODERATE = 'moderate',
  LOW = 'low',
  INFO = 'info',
}

export enum UpdateStrategy {
  CONSERVATIVE = 'conservative', // Only patch updates
  MODERATE = 'moderate', // Patch and minor updates
  AGGRESSIVE = 'aggressive', // All updates including major
  MANUAL = 'manual', // No auto-updates
}

export interface Dependency {
  name: string;
  currentVersion: string;
  latestVersion: string;
  type: 'dependencies' | 'devDependencies' | 'peerDependencies';
  status: DependencyStatus;
  homepage?: string;
  repository?: string;
  license?: string;
  lastUpdated?: number;
}

export interface Vulnerability {
  id: string;
  cve?: string;
  severity: VulnerabilitySeverity;
  title: string;
  description: string;
  affectedPackage: string;
  affectedVersions: string;
  patchedVersion?: string;
  publishedDate: number;
  references: string[];
  cvssScore?: number;
}

export interface DependencyReport {
  timestamp: number;
  totalDependencies: number;
  dependencies: Dependency[];
  vulnerabilities: Vulnerability[];
  outdated: Dependency[];
  deprecated: Dependency[];
  unused: string[];
  summary: {
    upToDate: number;
    minorUpdates: number;
    majorUpdates: number;
    critical: number;
    high: number;
    moderate: number;
    low: number;
  };
  updateRecommendations: UpdateRecommendation[];
}

export interface UpdateRecommendation {
  package: string;
  from: string;
  to: string;
  type: 'patch' | 'minor' | 'major';
  priority: 'critical' | 'high' | 'medium' | 'low';
  reason: string;
  breakingChanges?: boolean;
  autoPatchable: boolean;
  migrationGuide?: string;
}

export interface DependencyUpdate {
  package: string;
  from: string;
  to: string;
  success: boolean;
  error?: string;
  timestamp: number;
}

export interface LicenseInfo {
  name: string;
  type: string;
  compatible: boolean;
  risk: 'low' | 'medium' | 'high';
  packages: string[];
}

export interface DependencyAnalysis {
  sizeAnalysis: {
    totalSize: number; // in MB
    largestDependencies: Array<{
      name: string;
      size: number;
    }>;
  };
  unusedDependencies: string[];
  duplicateDependencies: Array<{
    name: string;
    versions: string[];
  }>;
  licenseIssues: LicenseInfo[];
  peerDependencyIssues: Array<{
    package: string;
    required: string;
    installed: string;
  }>;
}

export interface UpdateOptions {
  strategy?: UpdateStrategy;
  includeDevDependencies?: boolean;
  autoMerge?: boolean;
  runTests?: boolean;
  createBackup?: boolean;
  packages?: string[];
}
