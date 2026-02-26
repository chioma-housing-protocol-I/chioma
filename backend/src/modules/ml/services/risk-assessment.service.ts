import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import {
  RiskAssessmentRequest,
  RiskAssessmentResult,
  RiskFactor,
  RiskLevel,
  RiskCategory,
  RiskMitigation,
} from '../types/risk-assessment.types';
import { MLModelService } from './ml-model.service';
import { FraudDetectionService } from './fraud-detection.service';

@Injectable()
export class RiskAssessmentService {
  private readonly logger = new Logger(RiskAssessmentService.name);

  private readonly categoryWeights = {
    [RiskCategory.FINANCIAL]: 0.35,
    [RiskCategory.SECURITY]: 0.25,
    [RiskCategory.OPERATIONAL]: 0.20,
    [RiskCategory.COMPLIANCE]: 0.15,
    [RiskCategory.REPUTATION]: 0.05,
  };

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private mlModelService: MLModelService,
    private fraudDetectionService: FraudDetectionService,
  ) {}

  async assessRisk(request: RiskAssessmentRequest): Promise<RiskAssessmentResult> {
    const startTime = Date.now();
    this.logger.log(`Assessing risk for ${request.entityType} ${request.entityId}`);

    const cacheKey = `risk:assessment:${request.entityType}:${request.entityId}`;
    const cached = await this.cacheManager.get<RiskAssessmentResult>(cacheKey);

    if (cached && cached.validUntil > new Date()) {
      this.logger.log(`Returning cached risk assessment`);
      return cached;
    }

    const factors: RiskFactor[] = [];

    const financialFactors = await this.assessFinancialRisk(request);
    factors.push(...financialFactors);

    const securityFactors = await this.assessSecurityRisk(request);
    factors.push(...securityFactors);

    const operationalFactors = await this.assessOperationalRisk(request);
    factors.push(...operationalFactors);

    const complianceFactors = await this.assessComplianceRisk(request);
    factors.push(...complianceFactors);

    const reputationFactors = await this.assessReputationRisk(request);
    factors.push(...reputationFactors);

    const overallRiskScore = this.calculateOverallRiskScore(factors);
    const riskLevel = this.determineRiskLevel(overallRiskScore);
    const recommendations = this.generateRecommendations(factors, riskLevel);

    const result: RiskAssessmentResult = {
      entityId: request.entityId,
      entityType: request.entityType,
      overallRiskScore,
      riskLevel,
      factors,
      recommendations,
      confidence: 0.88,
      assessedAt: new Date(),
      validUntil: new Date(Date.now() + 3600000), // Valid for 1 hour
    };

    await this.cacheManager.set(cacheKey, result, 3600000);

    const processingTime = Date.now() - startTime;
    this.logger.log(
      `Risk assessment completed: ${riskLevel} (${overallRiskScore}/100) in ${processingTime}ms`,
    );

    return result;
  }

  private async assessFinancialRisk(request: RiskAssessmentRequest): Promise<RiskFactor[]> {
    const factors: RiskFactor[] = [];

    if (request.entityType === 'transaction' || request.entityType === 'user') {
      const transactionHistory = await this.getTransactionHistory(request.entityId);
      
      if (transactionHistory.totalAmount > 100000) {
        factors.push({
          category: RiskCategory.FINANCIAL,
          factor: 'high_transaction_volume',
          score: 65,
          weight: this.categoryWeights[RiskCategory.FINANCIAL],
          description: 'High transaction volume detected',
        });
      }

      if (transactionHistory.failedTransactions > 5) {
        factors.push({
          category: RiskCategory.FINANCIAL,
          factor: 'failed_transactions',
          score: 45,
          weight: this.categoryWeights[RiskCategory.FINANCIAL],
          description: `${transactionHistory.failedTransactions} failed transactions`,
        });
      }

      if (transactionHistory.chargebacks > 0) {
        factors.push({
          category: RiskCategory.FINANCIAL,
          factor: 'chargebacks',
          score: 75,
          weight: this.categoryWeights[RiskCategory.FINANCIAL],
          description: 'History of chargebacks detected',
        });
      }
    }

    if (request.entityType === 'property') {
      const propertyValue = request.context?.propertyValue || 0;
      if (propertyValue > 1000000) {
        factors.push({
          category: RiskCategory.FINANCIAL,
          factor: 'high_value_property',
          score: 40,
          weight: this.categoryWeights[RiskCategory.FINANCIAL],
          description: 'High-value property requires additional oversight',
        });
      }
    }

    return factors;
  }

  private async assessSecurityRisk(request: RiskAssessmentRequest): Promise<RiskFactor[]> {
    const factors: RiskFactor[] = [];

    if (request.entityType === 'user') {
      const securityProfile = await this.getSecurityProfile(request.entityId);

      if (!securityProfile.mfaEnabled) {
        factors.push({
          category: RiskCategory.SECURITY,
          factor: 'no_mfa',
          score: 55,
          weight: this.categoryWeights[RiskCategory.SECURITY],
          description: 'Multi-factor authentication not enabled',
        });
      }

      if (securityProfile.suspiciousLoginAttempts > 3) {
        factors.push({
          category: RiskCategory.SECURITY,
          factor: 'suspicious_logins',
          score: 70,
          weight: this.categoryWeights[RiskCategory.SECURITY],
          description: 'Multiple suspicious login attempts detected',
        });
      }

      if (securityProfile.accountAge < 30) {
        factors.push({
          category: RiskCategory.SECURITY,
          factor: 'new_account',
          score: 35,
          weight: this.categoryWeights[RiskCategory.SECURITY],
          description: 'New account with limited history',
        });
      }
    }

    return factors;
  }

  private async assessOperationalRisk(request: RiskAssessmentRequest): Promise<RiskFactor[]> {
    const factors: RiskFactor[] = [];

    if (request.entityType === 'agreement' || request.entityType === 'property') {
      const disputeHistory = await this.getDisputeHistory(request.entityId);

      if (disputeHistory.totalDisputes > 2) {
        factors.push({
          category: RiskCategory.OPERATIONAL,
          factor: 'dispute_history',
          score: 60,
          weight: this.categoryWeights[RiskCategory.OPERATIONAL],
          description: `${disputeHistory.totalDisputes} disputes recorded`,
        });
      }

      if (disputeHistory.openDisputes > 0) {
        factors.push({
          category: RiskCategory.OPERATIONAL,
          factor: 'open_disputes',
          score: 70,
          weight: this.categoryWeights[RiskCategory.OPERATIONAL],
          description: 'Active disputes require resolution',
        });
      }
    }

    if (request.entityType === 'user') {
      const responseTime = await this.getAverageResponseTime(request.entityId);
      if (responseTime > 48) {
        factors.push({
          category: RiskCategory.OPERATIONAL,
          factor: 'slow_response',
          score: 40,
          weight: this.categoryWeights[RiskCategory.OPERATIONAL],
          description: 'Slow response time to inquiries',
        });
      }
    }

    return factors;
  }

  private async assessComplianceRisk(request: RiskAssessmentRequest): Promise<RiskFactor[]> {
    const factors: RiskFactor[] = [];

    if (request.entityType === 'user') {
      const verificationStatus = await this.getVerificationStatus(request.entityId);

      if (verificationStatus.kycStatus !== 'verified') {
        factors.push({
          category: RiskCategory.COMPLIANCE,
          factor: 'incomplete_kyc',
          score: 65,
          weight: this.categoryWeights[RiskCategory.COMPLIANCE],
          description: 'KYC verification incomplete',
        });
      }

      if (!verificationStatus.termsAccepted) {
        factors.push({
          category: RiskCategory.COMPLIANCE,
          factor: 'terms_not_accepted',
          score: 80,
          weight: this.categoryWeights[RiskCategory.COMPLIANCE],
          description: 'Terms and conditions not accepted',
        });
      }
    }

    if (request.entityType === 'property') {
      const propertyCompliance = await this.getPropertyCompliance(request.entityId);
      
      if (!propertyCompliance.licenseVerified) {
        factors.push({
          category: RiskCategory.COMPLIANCE,
          factor: 'no_license',
          score: 75,
          weight: this.categoryWeights[RiskCategory.COMPLIANCE],
          description: 'Property license not verified',
        });
      }
    }

    return factors;
  }

  private async assessReputationRisk(request: RiskAssessmentRequest): Promise<RiskFactor[]> {
    const factors: RiskFactor[] = [];

    if (request.entityType === 'user' || request.entityType === 'property') {
      const reviews = await this.getReviews(request.entityId);

      if (reviews.averageRating < 3.0 && reviews.totalReviews > 5) {
        factors.push({
          category: RiskCategory.REPUTATION,
          factor: 'low_rating',
          score: 55,
          weight: this.categoryWeights[RiskCategory.REPUTATION],
          description: `Low average rating: ${reviews.averageRating}/5`,
        });
      }

      if (reviews.negativeReviews > reviews.totalReviews * 0.4) {
        factors.push({
          category: RiskCategory.REPUTATION,
          factor: 'negative_feedback',
          score: 50,
          weight: this.categoryWeights[RiskCategory.REPUTATION],
          description: 'High percentage of negative feedback',
        });
      }
    }

    return factors;
  }

  private calculateOverallRiskScore(factors: RiskFactor[]): number {
    if (factors.length === 0) return 10;

    const categorizedScores = new Map<RiskCategory, number[]>();

    factors.forEach((factor) => {
      if (!categorizedScores.has(factor.category)) {
        categorizedScores.set(factor.category, []);
      }
      categorizedScores.get(factor.category)!.push(factor.score);
    });

    let totalScore = 0;
    categorizedScores.forEach((scores, category) => {
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      totalScore += avgScore * this.categoryWeights[category];
    });

    return Math.min(Math.round(totalScore), 100);
  }

  private determineRiskLevel(score: number): RiskLevel {
    if (score >= 80) return RiskLevel.CRITICAL;
    if (score >= 60) return RiskLevel.HIGH;
    if (score >= 40) return RiskLevel.MODERATE;
    if (score >= 20) return RiskLevel.LOW;
    return RiskLevel.MINIMAL;
  }

  private generateRecommendations(factors: RiskFactor[], riskLevel: RiskLevel): string[] {
    const recommendations: string[] = [];

    if (riskLevel === RiskLevel.CRITICAL || riskLevel === RiskLevel.HIGH) {
      recommendations.push('Immediate review required');
      recommendations.push('Consider enhanced monitoring');
    }

    factors.forEach((factor) => {
      if (factor.score >= 70) {
        switch (factor.factor) {
          case 'incomplete_kyc':
            recommendations.push('Complete KYC verification');
            break;
          case 'no_mfa':
            recommendations.push('Enable multi-factor authentication');
            break;
          case 'high_transaction_volume':
            recommendations.push('Review transaction patterns');
            break;
          case 'dispute_history':
            recommendations.push('Resolve outstanding disputes');
            break;
        }
      }
    });

    if (recommendations.length === 0) {
      recommendations.push('Continue standard monitoring');
    }

    return [...new Set(recommendations)];
  }

  async getRiskMitigationStrategies(entityId: string): Promise<RiskMitigation[]> {
    const assessment = await this.assessRisk({
      entityId,
      entityType: 'user',
    });

    return assessment.factors
      .filter((f) => f.score >= 50)
      .map((f) => ({
        riskFactor: f.factor,
        action: this.getMitigationAction(f.factor),
        priority: f.score >= 70 ? 'high' : f.score >= 50 ? 'medium' : 'low',
        estimatedImpact: f.score * f.weight,
      }));
  }

  private getMitigationAction(factor: string): string {
    const actions: Record<string, string> = {
      incomplete_kyc: 'Complete identity verification process',
      no_mfa: 'Enable two-factor authentication',
      high_transaction_volume: 'Set transaction velocity limits',
      suspicious_logins: 'Review and secure account access',
      dispute_history: 'Implement dispute resolution protocols',
      no_license: 'Verify property licensing and documentation',
    };
    return actions[factor] || 'Review and address risk factor';
  }

  private async getTransactionHistory(entityId: string): Promise<any> {
    const key = `risk:transaction_history:${entityId}`;
    return await this.cacheManager.get(key) || {
      totalAmount: 0,
      failedTransactions: 0,
      chargebacks: 0,
    };
  }

  private async getSecurityProfile(entityId: string): Promise<any> {
    const key = `risk:security_profile:${entityId}`;
    return await this.cacheManager.get(key) || {
      mfaEnabled: false,
      suspiciousLoginAttempts: 0,
      accountAge: 0,
    };
  }

  private async getDisputeHistory(entityId: string): Promise<any> {
    return { totalDisputes: 0, openDisputes: 0 };
  }

  private async getAverageResponseTime(entityId: string): Promise<number> {
    return 12;
  }

  private async getVerificationStatus(entityId: string): Promise<any> {
    return {
      kycStatus: 'pending',
      termsAccepted: true,
    };
  }

  private async getPropertyCompliance(entityId: string): Promise<any> {
    return {
      licenseVerified: true,
    };
  }

  private async getReviews(entityId: string): Promise<any> {
    return {
      averageRating: 4.2,
      totalReviews: 10,
      negativeReviews: 1,
    };
  }
}
