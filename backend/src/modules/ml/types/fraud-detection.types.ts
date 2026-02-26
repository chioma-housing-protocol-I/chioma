export enum FraudRiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface TransactionData {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  location?: {
    latitude: number;
    longitude: number;
    country?: string;
    city?: string;
  };
  deviceFingerprint?: string;
  paymentMethod?: string;
  merchantId?: string;
  transactionType?: string;
}

export interface FraudDetectionResult {
  transactionId: string;
  riskScore: number;
  riskLevel: FraudRiskLevel;
  isBlocked: boolean;
  reasons: string[];
  flags: FraudFlag[];
  confidence: number;
  timestamp: Date;
  requiresReview: boolean;
}

export interface FraudFlag {
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  score: number;
}

export interface UserBehaviorPattern {
  userId: string;
  averageTransactionAmount: number;
  transactionFrequency: number;
  commonLocations: string[];
  commonDevices: string[];
  accountAge: number;
  verificationLevel: string;
  historicalFraudScore: number;
}

export interface FraudDetectionConfig {
  highRiskThreshold: number;
  mediumRiskThreshold: number;
  autoBlockThreshold: number;
  velocityCheckWindow: number;
  maxTransactionAmount: number;
  enableGeolocationCheck: boolean;
  enableDeviceFingerprintCheck: boolean;
  enableBehavioralAnalysis: boolean;
}
