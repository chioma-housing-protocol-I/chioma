import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { MlModelManagerService } from './ml-model-manager.service';
import { FraudDetectionService } from './fraud-detection.service';
import { RecommendationEngineService } from './recommendation-engine.service';

@Module({
  controllers: [AiController],
  providers: [
    MlModelManagerService,
    FraudDetectionService,
    RecommendationEngineService,
  ],
})
export class AiModule {}
