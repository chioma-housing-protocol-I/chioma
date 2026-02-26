import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { MLModelService } from './services/ml-model.service';
import { FraudDetectionService } from './services/fraud-detection.service';
import { RecommendationService } from './services/recommendation.service';
import { RiskAssessmentService } from './services/risk-assessment.service';
import { MLController } from './controllers/ml.controller';

@Module({
  imports: [CacheModule],
  controllers: [MLController],
  providers: [
    MLModelService,
    FraudDetectionService,
    RecommendationService,
    RiskAssessmentService,
  ],
  exports: [
    MLModelService,
    FraudDetectionService,
    RecommendationService,
    RiskAssessmentService,
  ],
})
export class MLModule {}
