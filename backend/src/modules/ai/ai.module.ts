import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiController } from './ai.controller';
import { MlModelManagerService } from './ml-model-manager.service';
import { FraudDetectionService } from './fraud-detection.service';
import { RecommendationEngineService } from './recommendation-engine.service';
import { MatchingAiService } from './matching-ai.service';
import { MatchingAiController } from './controllers/matching-ai.controller';
import { UserPreferences } from './entities/user-preferences.entity';
import { Property } from '../properties/entities/property.entity';
import { Favorite } from '../favorites/entities/favorite.entity';
import { SavedSearch } from '../search/entities/saved-search.entity';
import { UserRecommendationService } from './user-recommendation.service';
import { CacheService } from '../../common/cache/cache.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserPreferences,
      Property,
      Favorite,
      SavedSearch,
    ]),
  ],
  controllers: [AiController, MatchingAiController],
  providers: [
    MlModelManagerService,
    FraudDetectionService,
    RecommendationEngineService,
    UserRecommendationService,
    MatchingAiService,
    CacheService,
  ],
  exports: [MatchingAiService, RecommendationEngineService],
})
export class AiModule {}
