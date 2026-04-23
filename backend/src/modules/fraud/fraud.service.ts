import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from '../payments/entities/payment.entity';
import { Property } from '../properties/entities/property.entity';
import { User } from '../users/entities/user.entity';
import { CheckTransactionFraudDto } from './dto/check-transaction-fraud.dto';
import { FraudAlertsService } from './fraud-alerts.service';
import { FraudFeatureExtractionService } from './fraud-feature-extraction.service';
import { FraudModelService } from './fraud-model.service';
import { FraudScoreResult } from './fraud.types';

@Injectable()
export class FraudService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Property)
    private readonly propertiesRepository: Repository<Property>,
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    private readonly featureExtraction: FraudFeatureExtractionService,
    private readonly modelService: FraudModelService,
    private readonly alertsService: FraudAlertsService,
  ) {}

  async checkUserFraud(userId: string): Promise<FraudScoreResult> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const features = this.featureExtraction.extractUserFeatures(user);
    const scored = this.modelService.score(features);
    const result: FraudScoreResult = {
      ...scored,
      features,
      modelVersion: this.modelService.getModelVersion(),
    };
    await this.alertsService.createAlert('user', userId, result);
    return result;
  }

  async checkListingFraud(listingId: string): Promise<FraudScoreResult> {
    const listing = await this.propertiesRepository.findOne({
      where: { id: listingId },
    });
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    const ownerPromise = this.usersRepository.findOne({
      where: { id: listing.ownerId },
    });
    const peerListingsPromise = listing.city
      ? this.propertiesRepository.find({
          where: { city: listing.city },
          take: 30,
        })
      : this.propertiesRepository.find({
          order: { createdAt: 'DESC' },
          take: 30,
        });

    const [owner, peerListings] = await Promise.all([
      ownerPromise,
      peerListingsPromise,
    ]);

    const features = this.featureExtraction.extractListingFeatures(
      listing,
      owner,
      peerListings,
    );
    const scored = this.modelService.score(features);
    const result: FraudScoreResult = {
      ...scored,
      features,
      modelVersion: this.modelService.getModelVersion(),
    };
    await this.alertsService.createAlert('listing', listingId, result);
    return result;
  }

  async checkTransactionFraud(
    payload: CheckTransactionFraudDto,
  ): Promise<FraudScoreResult> {
    const user = await this.usersRepository.findOne({
      where: { id: payload.userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const recentPayments = await this.paymentsRepository.find({
      where: { userId: payload.userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });

    const features = this.featureExtraction.extractTransactionFeatures(
      user,
      recentPayments,
      payload.amount,
      payload.paymentMethod,
    );
    const scored = this.modelService.score(features);
    const result: FraudScoreResult = {
      ...scored,
      features,
      modelVersion: this.modelService.getModelVersion(),
    };
    await this.alertsService.createAlert('transaction', payload.userId, result);
    return result;
  }
}
