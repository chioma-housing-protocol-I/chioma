import { Injectable } from '@nestjs/common';
import { KycStatus } from '../kyc/kyc-status.enum';
import { Payment, PaymentStatus } from '../payments/entities/payment.entity';
import { Property } from '../properties/entities/property.entity';
import { User } from '../users/entities/user.entity';
import { FraudFeatures } from './fraud.types';

@Injectable()
export class FraudFeatureExtractionService {
  extractUserFeatures(user: User): FraudFeatures {
    const accountAgeDays = this.daysSince(user.createdAt);
    const isKycVerified = user.kycStatus === KycStatus.APPROVED ? 1 : 0;

    return {
      accountAgeDays: this.clamp01(accountAgeDays / 365),
      failedLoginAttempts: this.clamp01(user.failedLoginAttempts / 10),
      loginCount: this.clamp01(user.loginCount / 300),
      isKycVerified,
    };
  }

  extractListingFeatures(
    listing: Property,
    owner: User | null,
    peerListings: Property[],
  ): FraudFeatures {
    const prices = peerListings
      .map((item) => Number(item.price))
      .filter(Boolean);
    const marketAvg = prices.length
      ? prices.reduce((acc, value) => acc + value, 0) / prices.length
      : Number(listing.price);
    const listingPrice = Number(listing.price);
    const priceDeviation =
      marketAvg > 0 ? Math.abs(listingPrice - marketAvg) / marketAvg : 0;
    const riskyTerms = [
      'wire',
      'crypto-only',
      'urgent',
      'cash-only',
      'outside platform',
    ];
    const text =
      `${listing.title ?? ''} ${listing.description ?? ''}`.toLowerCase();
    const riskyTermHits = riskyTerms.filter((term) =>
      text.includes(term),
    ).length;

    return {
      listingPriceAnomaly: this.clamp01(priceDeviation),
      listingContentRisk: this.clamp01(riskyTermHits / 2),
      accountAgeDays: owner
        ? this.clamp01(this.daysSince(owner.createdAt) / 365)
        : 0,
      isKycVerified: owner?.kycStatus === KycStatus.APPROVED ? 1 : 0,
    };
  }

  extractTransactionFeatures(
    user: User,
    recentPayments: Payment[],
    amount: number,
    paymentMethod?: string,
  ): FraudFeatures {
    const paymentAmounts = recentPayments.map((payment) =>
      Number(payment.amount),
    );
    const historicalAverage = paymentAmounts.length
      ? paymentAmounts.reduce((acc, value) => acc + value, 0) /
        paymentAmounts.length
      : amount;
    const amountAnomaly =
      historicalAverage > 0
        ? Math.abs(amount - historicalAverage) / historicalAverage
        : 0;
    const recentInLastHour = recentPayments.filter((payment) =>
      this.isAfterWithinHours(payment.createdAt, 1),
    ).length;
    const failedCount = recentPayments.filter(
      (payment) => payment.status === PaymentStatus.FAILED,
    ).length;
    const failureRate =
      recentPayments.length > 0 ? failedCount / recentPayments.length : 0;
    const isNewMethod = paymentMethod
      ? !recentPayments.some(
          (payment) => payment.paymentMethod === paymentMethod,
        )
      : false;

    return {
      accountAgeDays: this.clamp01(this.daysSince(user.createdAt) / 365),
      isKycVerified: user.kycStatus === KycStatus.APPROVED ? 1 : 0,
      paymentAmountAnomaly: this.clamp01(amountAnomaly),
      rapidPaymentVelocity: this.clamp01(recentInLastHour / 5),
      paymentFailureRate: this.clamp01(failureRate),
      newPaymentMethodRisk: isNewMethod ? 1 : 0,
    };
  }

  private clamp01(value: number): number {
    if (!Number.isFinite(value)) {
      return 0;
    }
    return Math.max(0, Math.min(1, value));
  }

  private daysSince(value: Date): number {
    const created = new Date(value).getTime();
    const now = Date.now();
    if (!Number.isFinite(created) || created <= 0) {
      return 0;
    }
    return (now - created) / (1000 * 60 * 60 * 24);
  }

  private isAfterWithinHours(value: Date, hours: number): boolean {
    const threshold = Date.now() - hours * 60 * 60 * 1000;
    return new Date(value).getTime() >= threshold;
  }
}
