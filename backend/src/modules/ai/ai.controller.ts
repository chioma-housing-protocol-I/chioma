import {
  Body,
  Controller,
  Get,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { UserRecommendationService } from './user-recommendation.service';
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
    private readonly userRecommendations: UserRecommendationService,
  ) {}

  @ApiResponse({ status: 200, description: 'Retrieved' })
  @Get('recommendations/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOperation({
    summary:
      'Recommended properties for the current user, built from preferences, favorites and saved searches',
  })
  getMyRecommendations(
    @CurrentUser() user: User,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.userRecommendations.recommendForUser(user.id, limit ?? 10);
  }

  @ApiResponse({ status: 200, description: 'Retrieved' })
  @Get('models')
  @ApiOperation({ summary: 'List available ML models' })
  getModels() {
    return this.modelManager.listModels();
  }

  @ApiResponse({ status: 201, description: 'Created' })
  @Post('fraud/score')
  @ApiOperation({ summary: 'Score a transaction for fraud risk' })
  scoreFraud(@Body() input: FraudSignalInput) {
    return this.fraudDetection.scoreTransaction(input);
  }

  @ApiResponse({ status: 201, description: 'Created' })
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
