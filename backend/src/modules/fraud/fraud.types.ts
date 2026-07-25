export type FraudSubjectType = 'user' | 'listing' | 'transaction';

export type FraudDecision = 'allow' | 'review' | 'block';

export interface FraudFeatures {
  [featureName: string]: number;
}

export interface FraudScoreResult {
  score: number;
  decision: FraudDecision;
  reasons: string[];
  features: FraudFeatures;
  modelVersion: string;
}

export interface FraudAlert {
  id: string;
  subjectType: FraudSubjectType;
  subjectId: string;
  score: number;
  decision: FraudDecision;
  reasons: string[];
  createdAt: string;
  resolvedAt?: string;
  status: 'open' | 'resolved';
}
