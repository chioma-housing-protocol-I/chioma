export enum UserTier {
  FREE = 'free',
  BASIC = 'basic',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
}

export enum EndpointCategory {
  PUBLIC = 'public',
  AUTH = 'auth',
  FINANCIAL = 'financial',
  PROPERTY = 'property',
  USER = 'user',
  ADMIN = 'admin',
  UPLOAD = 'upload',
}

export interface RateLimitConfig {
  points: number;
  duration: number;
  blockDuration?: number;
}

export interface TierLimits {
  [key: string]: RateLimitConfig;
}

export interface RateLimitResult {
  success: boolean;
  remainingPoints: number;
  msBeforeNext: number;
  isBlocked: boolean;
}

export interface AbuseDetectionResult {
  isAbuser: boolean;
  abuseScore: number;
  violations: string[];
  blockUntil?: Date;
}

export interface RateLimitMetrics {
  totalRequests: number;
  blockedRequests: number;
  uniqueUsers: number;
  abuseDetections: number;
  averageResponseTime: number;
}
