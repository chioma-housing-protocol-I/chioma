import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import {
  TransactionData,
  FraudDetectionResult,
  FraudRiskLevel,
  FraudFlag,
  UserBehaviorPattern,
  FraudDetectionConfig,
} from '../types/fraud-detection.types';
import { MLModelService } from './ml-model.service';
import { ModelType } from '../types/ml.types';

@Injectable()
export class FraudDetectionService {
  private readonly logger = new Logger(FraudDetectionService.name);

  private readonly config: FraudDetectionConfig = {
    highRiskThreshold: 70,
    mediumRiskThreshold: 40,
    autoBlockThreshold: 85,
    velocityCheckWindow: 3600000, // 1 hour
    maxTransactionAmount: 100000,
    enableGeolocationCheck: true,
    enableDeviceFingerprintCheck: true,
    enableBehavioralAnalysis: true,
  };

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private mlModelService: MLModelService,
  ) {}

  async analyzeTransaction(transaction: TransactionData): Promise<FraudDetectionResult> {
    const startTime = Date.now();
    this.logger.log(`Analyzing transaction ${transaction.id} for fraud`);

    const flags: FraudFlag[] = [];
    let riskScore = 0;

    const amountCheck = await this.checkTransactionAmount(transaction);
    if (amountCheck) {
      flags.push(amountCheck);
      riskScore += amountCheck.score;
    }

    const velocityCheck = await this.checkVelocity(transaction);
    if (velocityCheck) {
      flags.push(velocityCheck);
      riskScore += velocityCheck.score;
    }

    if (this.config.enableGeolocationCheck && transaction.location) {
      const geoCheck = await this.checkGeolocation(transaction);
      if (geoCheck) {
        flags.push(geoCheck);
        riskScore += geoCheck.score;
      }
    }

    if (this.config.enableDeviceFingerprintCheck && transaction.deviceFingerprint) {
      const deviceCheck = await this.checkDeviceFingerprint(transaction);
      if (deviceCheck) {
        flags.push(deviceCheck);
        riskScore += deviceCheck.score;
      }
    }

    if (this.config.enableBehavioralAnalysis) {
      const behaviorCheck = await this.analyzeBehavior(transaction);
      if (behaviorCheck) {
        flags.push(behaviorCheck);
        riskScore += behaviorCheck.score;
      }
    }

    const networkCheck = await this.analyzeNetwork(transaction);
    if (networkCheck) {
      flags.push(networkCheck);
      riskScore += networkCheck.score;
    }

    const timeCheck = await this.checkTransactionTime(transaction);
    if (timeCheck) {
      flags.push(timeCheck);
      riskScore += timeCheck.score;
    }

    riskScore = Math.min(riskScore, 100);

    const riskLevel = this.calculateRiskLevel(riskScore);
    const isBlocked = riskScore >= this.config.autoBlockThreshold;
    const requiresReview = riskScore >= this.config.mediumRiskThreshold && !isBlocked;

    const result: FraudDetectionResult = {
      transactionId: transaction.id,
      riskScore,
      riskLevel,
      isBlocked,
      reasons: flags.map((f) => f.description),
      flags,
      confidence: 0.92,
      timestamp: new Date(),
      requiresReview,
    };

    await this.recordFraudCheck(transaction.id, result);

    const processingTime = Date.now() - startTime;
    this.logger.log(
      `Fraud analysis completed for ${transaction.id}: ${riskLevel} risk (${riskScore}/100) in ${processingTime}ms`,
    );

    return result;
  }

  private async checkTransactionAmount(transaction: TransactionData): Promise<FraudFlag | null> {
    if (transaction.amount > this.config.maxTransactionAmount) {
      return {
        type: 'high_amount',
        severity: 'high',
        description: `Transaction amount (${transaction.amount}) exceeds maximum limit`,
        score: 25,
      };
    }

    const userPattern = await this.getUserBehaviorPattern(transaction.userId);
    if (userPattern && transaction.amount > userPattern.averageTransactionAmount * 5) {
      return {
        type: 'unusual_amount',
        severity: 'medium',
        description: `Transaction amount significantly higher than user average`,
        score: 15,
      };
    }

    return null;
  }

  private async checkVelocity(transaction: TransactionData): Promise<FraudFlag | null> {
    const key = `fraud:velocity:${transaction.userId}`;
    const recentTransactions = await this.cacheManager.get<TransactionData[]>(key) || [];

    const now = transaction.timestamp.getTime();
    const windowStart = now - this.config.velocityCheckWindow;

    const recentCount = recentTransactions.filter(
      (t) => t.timestamp.getTime() >= windowStart,
    ).length;

    if (recentCount >= 10) {
      return {
        type: 'high_velocity',
        severity: 'high',
        description: `${recentCount} transactions in the last hour`,
        score: 30,
      };
    }

    if (recentCount >= 5) {
      return {
        type: 'medium_velocity',
        severity: 'medium',
        description: `${recentCount} transactions in the last hour`,
        score: 15,
      };
    }

    recentTransactions.push(transaction);
    await this.cacheManager.set(key, recentTransactions, this.config.velocityCheckWindow);

    return null;
  }

  private async checkGeolocation(transaction: TransactionData): Promise<FraudFlag | null> {
    if (!transaction.location) return null;

    const userPattern = await this.getUserBehaviorPattern(transaction.userId);
    if (!userPattern || userPattern.commonLocations.length === 0) {
      return null;
    }

    const isCommonLocation = userPattern.commonLocations.some((loc) =>
      transaction.location?.country?.toLowerCase().includes(loc.toLowerCase()),
    );

    if (!isCommonLocation) {
      return {
        type: 'unusual_location',
        severity: 'high',
        description: `Transaction from unusual geographic location`,
        score: 20,
      };
    }

    const lastTransactionKey = `fraud:last_location:${transaction.userId}`;
    const lastLocation = await this.cacheManager.get<any>(lastTransactionKey);

    if (lastLocation && lastLocation.timestamp) {
      const timeDiff = transaction.timestamp.getTime() - lastLocation.timestamp;
      const distance = this.calculateDistance(
        lastLocation.latitude,
        lastLocation.longitude,
        transaction.location.latitude,
        transaction.location.longitude,
      );

      const maxSpeed = (distance / (timeDiff / 3600000)) * 1000; // km/h
      if (maxSpeed > 800) {
        return {
          type: 'impossible_travel',
          severity: 'high',
          description: `Transaction location impossible to reach in time`,
          score: 35,
        };
      }
    }

    await this.cacheManager.set(
      lastTransactionKey,
      {
        latitude: transaction.location.latitude,
        longitude: transaction.location.longitude,
        timestamp: transaction.timestamp.getTime(),
      },
      86400000,
    );

    return null;
  }

  private async checkDeviceFingerprint(transaction: TransactionData): Promise<FraudFlag | null> {
    const key = `fraud:devices:${transaction.userId}`;
    const knownDevices = await this.cacheManager.get<string[]>(key) || [];

    if (knownDevices.length > 0 && !knownDevices.includes(transaction.deviceFingerprint!)) {
      if (knownDevices.length < 3) {
        return {
          type: 'new_device',
          severity: 'medium',
          description: `Transaction from new or unrecognized device`,
          score: 10,
        };
      }

      return {
        type: 'unusual_device',
        severity: 'high',
        description: `Transaction from unusual device`,
        score: 20,
      };
    }

    if (!knownDevices.includes(transaction.deviceFingerprint!)) {
      knownDevices.push(transaction.deviceFingerprint!);
      await this.cacheManager.set(key, knownDevices, 86400000 * 30);
    }

    return null;
  }

  private async analyzeBehavior(transaction: TransactionData): Promise<FraudFlag | null> {
    const userPattern = await this.getUserBehaviorPattern(transaction.userId);
    if (!userPattern) return null;

    if (userPattern.accountAge < 7) {
      return {
        type: 'new_account',
        severity: 'medium',
        description: `Transaction from account less than 7 days old`,
        score: 15,
      };
    }

    if (userPattern.verificationLevel === 'none' || userPattern.verificationLevel === 'basic') {
      return {
        type: 'low_verification',
        severity: 'medium',
        description: `Account has low verification level`,
        score: 12,
      };
    }

    if (userPattern.historicalFraudScore > 50) {
      return {
        type: 'high_historical_risk',
        severity: 'high',
        description: `User has history of suspicious activity`,
        score: 25,
      };
    }

    return null;
  }

  private async analyzeNetwork(transaction: TransactionData): Promise<FraudFlag | null> {
    if (!transaction.ipAddress) return null;

    const key = `fraud:ip_reputation:${transaction.ipAddress}`;
    const reputation = await this.cacheManager.get<number>(key);

    if (reputation && reputation < 30) {
      return {
        type: 'bad_ip_reputation',
        severity: 'high',
        description: `Transaction from IP with poor reputation`,
        score: 25,
      };
    }

    return null;
  }

  private async checkTransactionTime(transaction: TransactionData): Promise<FraudFlag | null> {
    const hour = transaction.timestamp.getHours();

    if (hour >= 2 && hour <= 5) {
      return {
        type: 'unusual_time',
        severity: 'low',
        description: `Transaction during unusual hours (${hour}:00)`,
        score: 5,
      };
    }

    return null;
  }

  private calculateRiskLevel(score: number): FraudRiskLevel {
    if (score >= this.config.highRiskThreshold) return FraudRiskLevel.HIGH;
    if (score >= this.config.mediumRiskThreshold) return FraudRiskLevel.MEDIUM;
    return FraudRiskLevel.LOW;
  }

  private async getUserBehaviorPattern(userId: string): Promise<UserBehaviorPattern | null> {
    const key = `fraud:user_pattern:${userId}`;
    return await this.cacheManager.get<UserBehaviorPattern>(key);
  }

  private async recordFraudCheck(transactionId: string, result: FraudDetectionResult): Promise<void> {
    const key = `fraud:check:${transactionId}`;
    await this.cacheManager.set(key, result, 86400000 * 30);

    const statsKey = 'fraud:stats:daily';
    const stats = await this.cacheManager.get<any>(statsKey) || {
      total: 0,
      blocked: 0,
      highRisk: 0,
    };

    stats.total++;
    if (result.isBlocked) stats.blocked++;
    if (result.riskLevel === FraudRiskLevel.HIGH) stats.highRisk++;

    await this.cacheManager.set(statsKey, stats, 86400000);
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  async getFraudStatistics(): Promise<any> {
    const statsKey = 'fraud:stats:daily';
    return await this.cacheManager.get(statsKey) || { total: 0, blocked: 0, highRisk: 0 };
  }
}
