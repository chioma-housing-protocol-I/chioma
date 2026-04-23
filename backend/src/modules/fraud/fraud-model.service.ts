import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { FraudDecision, FraudFeatures } from './fraud.types';

interface FraudModelArtifact {
  modelVersion: string;
  thresholdReview: number;
  thresholdBlock: number;
  featureWeights: Record<string, number>;
}

@Injectable()
export class FraudModelService {
  private readonly logger = new Logger(FraudModelService.name);

  private readonly defaultModel: FraudModelArtifact = {
    modelVersion: 'rules-v1',
    thresholdReview: 45,
    thresholdBlock: 75,
    featureWeights: {
      accountAgeDays: -0.6,
      failedLoginAttempts: 2.2,
      loginCount: -0.2,
      isKycVerified: -1.8,
      listingPriceAnomaly: 2.4,
      listingContentRisk: 1.8,
      paymentAmountAnomaly: 2.6,
      rapidPaymentVelocity: 2.2,
      paymentFailureRate: 1.8,
      newPaymentMethodRisk: 1.1,
    },
  };

  private readonly model: FraudModelArtifact;

  constructor() {
    this.model = this.loadModelArtifact();
  }

  getModelVersion(): string {
    return this.model.modelVersion;
  }

  score(features: FraudFeatures): {
    score: number;
    decision: FraudDecision;
    reasons: string[];
  } {
    let raw = 0;
    const reasons: string[] = [];

    for (const [featureName, featureValue] of Object.entries(features)) {
      const weight = this.model.featureWeights[featureName] ?? 0;
      raw += weight * featureValue;

      if (weight > 0 && featureValue >= 0.8) {
        reasons.push(featureName);
      }
    }

    const normalizedScore = Math.max(
      0,
      Math.min(100, Math.round(50 + raw * 10)),
    );
    const decision =
      normalizedScore >= this.model.thresholdBlock
        ? 'block'
        : normalizedScore >= this.model.thresholdReview
          ? 'review'
          : 'allow';

    return {
      score: normalizedScore,
      decision,
      reasons: reasons.length > 0 ? reasons : ['no_high_risk_signals'],
    };
  }

  private loadModelArtifact(): FraudModelArtifact {
    const artifactPath = path.resolve(
      process.cwd(),
      'ai-services/fraud/model-artifacts/fraud-model.json',
    );

    if (!fs.existsSync(artifactPath)) {
      this.logger.warn(
        'Fraud model artifact not found, using fallback scoring model.',
      );
      return this.defaultModel;
    }

    try {
      const artifact = JSON.parse(
        fs.readFileSync(artifactPath, 'utf-8'),
      ) as FraudModelArtifact;

      if (
        !artifact.modelVersion ||
        !artifact.featureWeights ||
        typeof artifact.thresholdReview !== 'number' ||
        typeof artifact.thresholdBlock !== 'number'
      ) {
        throw new Error('Fraud model artifact is missing required fields');
      }

      return artifact;
    } catch (error) {
      this.logger.error(
        'Failed to load fraud model artifact, using fallback model.',
        error instanceof Error ? error.stack : String(error),
      );
      return this.defaultModel;
    }
  }
}
