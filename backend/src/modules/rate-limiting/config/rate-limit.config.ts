import {
  EndpointCategory,
  TierLimits,
  UserTier,
} from '../types/rate-limit.types';

export const RATE_LIMIT_CONFIG: Record<UserTier, TierLimits> = {
  [UserTier.FREE]: {
    [EndpointCategory.PUBLIC]: { points: 100, duration: 60 },
    [EndpointCategory.AUTH]: { points: 5, duration: 900 },
    [EndpointCategory.FINANCIAL]: { points: 10, duration: 60 },
    [EndpointCategory.PROPERTY]: { points: 50, duration: 60 },
    [EndpointCategory.USER]: { points: 100, duration: 60 },
    [EndpointCategory.ADMIN]: { points: 0, duration: 60, blockDuration: 86400 },
    [EndpointCategory.UPLOAD]: { points: 5, duration: 300 },
  },
  [UserTier.BASIC]: {
    [EndpointCategory.PUBLIC]: { points: 300, duration: 60 },
    [EndpointCategory.AUTH]: { points: 10, duration: 900 },
    [EndpointCategory.FINANCIAL]: { points: 50, duration: 60 },
    [EndpointCategory.PROPERTY]: { points: 150, duration: 60 },
    [EndpointCategory.USER]: { points: 300, duration: 60 },
    [EndpointCategory.ADMIN]: { points: 0, duration: 60, blockDuration: 86400 },
    [EndpointCategory.UPLOAD]: { points: 20, duration: 300 },
  },
  [UserTier.PREMIUM]: {
    [EndpointCategory.PUBLIC]: { points: 1000, duration: 60 },
    [EndpointCategory.AUTH]: { points: 20, duration: 900 },
    [EndpointCategory.FINANCIAL]: { points: 200, duration: 60 },
    [EndpointCategory.PROPERTY]: { points: 500, duration: 60 },
    [EndpointCategory.USER]: { points: 1000, duration: 60 },
    [EndpointCategory.ADMIN]: { points: 0, duration: 60, blockDuration: 86400 },
    [EndpointCategory.UPLOAD]: { points: 100, duration: 300 },
  },
  [UserTier.ENTERPRISE]: {
    [EndpointCategory.PUBLIC]: { points: 10000, duration: 60 },
    [EndpointCategory.AUTH]: { points: 100, duration: 900 },
    [EndpointCategory.FINANCIAL]: { points: 1000, duration: 60 },
    [EndpointCategory.PROPERTY]: { points: 5000, duration: 60 },
    [EndpointCategory.USER]: { points: 10000, duration: 60 },
    [EndpointCategory.ADMIN]: { points: 1000, duration: 60 },
    [EndpointCategory.UPLOAD]: { points: 500, duration: 300 },
  },
};

export const ABUSE_DETECTION_CONFIG = {
  rapidFireThreshold: 50,
  rapidFireWindow: 10,
  violationThreshold: 5,
  abuseScoreLimit: 100,
  blockDuration: 3600,
  suspiciousPatterns: {
    repeatedFailedAuth: 10,
    unusualEndpointAccess: 100,
    rapidIpSwitching: 20,
  },
};

export const ANALYTICS_CONFIG = {
  metricsRetentionDays: 30,
  aggregationInterval: 300,
  alertThresholds: {
    blockedRequestsPercentage: 10,
    abuseDetectionsPerHour: 50,
    falsePositiveRate: 1,
  },
};
