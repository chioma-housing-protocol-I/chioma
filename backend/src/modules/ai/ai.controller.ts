import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MlModelManagerService } from './ml-model-manager.service';
import {
  FraudDetectionService,
  FraudSignalInput,
} from './fraud-detection.service';
import {
  PropertyCandidate,
  RecommendationEngineService,
  UserPreference,
} from './recommendation-engine.service';

@ApiTags('AI')
@Controller('ai')
export class AiController {
  constructor(
    private readonly modelManager: MlModelManagerService,
    private readonly fraudDetection: FraudDetectionService,
    private readonly recommendationEngine: RecommendationEngineService,
  ) {}

  @Get('models')
  @ApiOperation({ summary: 'List available ML models' })
  getModels() {
    return this.modelManager.listModels();
  }

  @Post('fraud/score')
  @ApiOperation({ summary: 'Score a transaction for fraud risk' })
  scoreFraud(@Body() input: FraudSignalInput) {
    return this.fraudDetection.scoreTransaction(input);
  }

  @Post('recommendations/properties')
  @ApiOperation({ summary: 'Generate ranked property recommendations' })
  getRecommendations(
    @Body()
    payload: {
      preferences: UserPreference;
      candidates: PropertyCandidate[];
    },
  ) {
    return this.recommendationEngine.recommend(
      payload.preferences,
      payload.candidates,
    );
  }
}
