/**
 * Mock implementation of FraudHooksService for testing
 * Simulates fraud detection and prevention
 */

export const mockFraudHooksService = {
  checkPaymentFraud: jest.fn(async (params: any) => ({
    isFraudulent: false,
    riskScore: 0.1,
    reason: null,
    checks: {
      velocityCheck: 'passed',
      amountCheck: 'passed',
      locationCheck: 'passed',
      deviceCheck: 'passed',
    },
  })),

  checkUserFraud: jest.fn(async (userId: string) => ({
    userId,
    isFraudulent: false,
    riskScore: 0.05,
    reason: null,
  })),

  checkRefundFraud: jest.fn(async (params: any) => ({
    isFraudulent: false,
    riskScore: 0.1,
    reason: null,
    refundCount: 0,
    totalRefundAmount: 0,
  })),

  blockUser: jest.fn(async (userId: string) => ({
    userId,
    status: 'blocked',
    blockedAt: new Date(),
    reason: 'Fraud detected',
  })),

  unblockUser: jest.fn(async (userId: string) => ({
    userId,
    status: 'active',
    unblockAt: new Date(),
  })),

  getBlockedUsers: jest.fn(async () => ({
    blockedUsers: [],
    total: 0,
  })),

  reportFraud: jest.fn(async (params: any) => ({
    reportId: `fraud-${Date.now()}`,
    userId: params.userId,
    type: params.type,
    status: 'reported',
    timestamp: new Date(),
  })),

  getFraudReport: jest.fn(async (reportId: string) => ({
    reportId,
    status: 'under_review',
    createdAt: new Date(),
  })),

  updateFraudRules: jest.fn(async (rules: any) => ({
    status: 'updated',
    rulesCount: Object.keys(rules).length,
    timestamp: new Date(),
  })),

  getFraudMetrics: jest.fn(async () => ({
    totalChecks: 1000,
    fraudDetected: 5,
    fraudRate: 0.005,
    averageRiskScore: 0.15,
  })),
};
