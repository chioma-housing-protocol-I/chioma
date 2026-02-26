export enum RiskCategory {
  FINANCIAL = 'financial',
  OPERATIONAL = 'operational',
  COMPLIANCE = 'compliance',
  SECURITY = 'security',
  REPUTATION = 'reputation',
}

export enum RiskLevel {
  MINIMAL = 'minimal',
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface RiskAssessmentRequest {
  entityId: string;
  entityType: 'user' | 'transaction' | 'property' | 'agreement';
  category?: RiskCategory;
  context?: Record<string, any>;
}

export interface RiskFactor {
  category: RiskCategory;
  factor: string;
  score: number;
  weight: number;
  description: string;
}

export interface RiskAssessmentResult {
  entityId: string;
  entityType: string;
  overallRiskScore: number;
  riskLevel: RiskLevel;
  factors: RiskFactor[];
  recommendations: string[];
  confidence: number;
  assessedAt: Date;
  validUntil: Date;
}

export interface RiskMitigation {
  riskFactor: string;
  action: string;
  priority: 'low' | 'medium' | 'high';
  estimatedImpact: number;
}
