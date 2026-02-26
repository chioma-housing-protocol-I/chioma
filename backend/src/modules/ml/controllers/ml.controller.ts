import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MLModelService } from '../services/ml-model.service';
import { FraudDetectionService } from '../services/fraud-detection.service';
import { RecommendationService } from '../services/recommendation.service';
import { RiskAssessmentService } from '../services/risk-assessment.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { TransactionData } from '../types/fraud-detection.types';
import { RecommendationRequest } from '../types/recommendation.types';
import { RiskAssessmentRequest } from '../types/risk-assessment.types';
import { SkipRateLimit } from '../../rate-limiting';

@ApiTags('ML & AI')
@Controller('ml')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MLController {
  constructor(
    private readonly mlModelService: MLModelService,
    private readonly fraudDetectionService: FraudDetectionService,
    private readonly recommendationService: RecommendationService,
    private readonly riskAssessmentService: RiskAssessmentService,
  ) {}

  @Get('models')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all ML models status' })
  async getModels() {
    return this.mlModelService.getAllModels();
  }

  @Get('models/:type/performance')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get model performance metrics' })
  async getModelPerformance(@Param('type') type: string) {
    return this.mlModelService.getModelPerformance(type as any);
  }

  @Post('fraud/analyze')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Analyze transaction for fraud' })
  async analyzeFraud(@Body() transaction: TransactionData) {
    return this.fraudDetectionService.analyzeTransaction(transaction);
  }

  @Get('fraud/statistics')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get fraud detection statistics' })
  async getFraudStatistics() {
    return this.fraudDetectionService.getFraudStatistics();
  }

  @Post('recommendations')
  @SkipRateLimit()
  @ApiOperation({ summary: 'Get personalized recommendations' })
  async getRecommendations(
    @Body() request: RecommendationRequest,
    @CurrentUser() user: any,
  ) {
    request.userId = request.userId || user.id;
    return this.recommendationService.generateRecommendations(request);
  }

  @Post('recommendations/interaction')
  @SkipRateLimit()
  @ApiOperation({ summary: 'Record user interaction for learning' })
  async recordInteraction(@Body() interaction: any) {
    return this.recommendationService.recordInteraction(interaction);
  }

  @Post('risk/assess')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Assess risk for entity' })
  async assessRisk(@Body() request: RiskAssessmentRequest) {
    return this.riskAssessmentService.assessRisk(request);
  }

  @Get('risk/mitigation/:entityId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get risk mitigation strategies' })
  async getRiskMitigation(@Param('entityId') entityId: string) {
    return this.riskAssessmentService.getRiskMitigationStrategies(entityId);
  }
}
