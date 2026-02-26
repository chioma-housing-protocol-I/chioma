import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import {
  RecommendationRequest,
  RecommendationResult,
  Recommendation,
  RecommendationType,
  UserPreferences,
  CollaborativeFilteringData,
} from '../types/recommendation.types';
import { MLModelService } from './ml-model.service';
import { ModelType } from '../types/ml.types';

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private mlModelService: MLModelService,
  ) {}

  async generateRecommendations(request: RecommendationRequest): Promise<RecommendationResult> {
    const startTime = Date.now();
    this.logger.log(`Generating ${request.type} recommendations for user ${request.userId}`);

    const cacheKey = this.buildCacheKey(request);
    const cached = await this.cacheManager.get<RecommendationResult>(cacheKey);

    if (cached) {
      this.logger.log(`Returning cached recommendations for ${request.userId}`);
      return cached;
    }

    let recommendations: Recommendation[] = [];
    let algorithm = 'hybrid';

    switch (request.type) {
      case RecommendationType.PROPERTY:
        recommendations = await this.recommendProperties(request);
        algorithm = 'collaborative-filtering-content-based';
        break;
      case RecommendationType.SIMILAR_LISTINGS:
        recommendations = await this.recommendSimilarListings(request);
        algorithm = 'content-based';
        break;
      case RecommendationType.USER_MATCH:
        recommendations = await this.recommendUserMatches(request);
        algorithm = 'collaborative-filtering';
        break;
      case RecommendationType.TRENDING:
        recommendations = await this.recommendTrending(request);
        algorithm = 'popularity-based';
        break;
    }

    recommendations = recommendations.slice(0, request.limit || 10);

    const result: RecommendationResult = {
      userId: request.userId,
      type: request.type,
      recommendations,
      algorithm,
      generatedAt: new Date(),
      totalAvailable: recommendations.length,
    };

    await this.cacheManager.set(cacheKey, result, 300000); // 5 min cache

    const processingTime = Date.now() - startTime;
    this.logger.log(
      `Generated ${recommendations.length} recommendations for ${request.userId} in ${processingTime}ms`,
    );

    return result;
  }

  private async recommendProperties(request: RecommendationRequest): Promise<Recommendation[]> {
    const userPreferences = await this.getUserPreferences(request.userId);
    const collaborativeScores = await this.getCollaborativeFilteringScores(request.userId);
    const contentScores = await this.getContentBasedScores(request.userId, userPreferences);

    const hybridScores = new Map<string, number>();

    collaborativeScores.forEach((score, itemId) => {
      hybridScores.set(itemId, score * 0.6);
    });

    contentScores.forEach((score, itemId) => {
      const existing = hybridScores.get(itemId) || 0;
      hybridScores.set(itemId, existing + score * 0.4);
    });

    if (request.context) {
      const contextualScores = await this.applyContextualBoost(request.context, hybridScores);
      contextualScores.forEach((score, itemId) => {
        hybridScores.set(itemId, score);
      });
    }

    const recommendations: Recommendation[] = Array.from(hybridScores.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([itemId, score]) => ({
        itemId,
        score,
        reasons: this.generateReasons(itemId, userPreferences),
        confidence: 0.85,
        metadata: {},
      }));

    return this.diversifyRecommendations(recommendations);
  }

  private async recommendSimilarListings(request: RecommendationRequest): Promise<Recommendation[]> {
    const currentPropertyId = request.context?.currentPropertyId;
    if (!currentPropertyId) {
      return [];
    }

    const key = `recommendations:similar:${currentPropertyId}`;
    const cached = await this.cacheManager.get<Recommendation[]>(key);
    if (cached) return cached;

    const similarItems = await this.findSimilarItems(currentPropertyId);
    
    await this.cacheManager.set(key, similarItems, 3600000); // 1 hour cache
    return similarItems;
  }

  private async recommendUserMatches(request: RecommendationRequest): Promise<Recommendation[]> {
    const userProfile = await this.getUserProfile(request.userId);
    if (!userProfile) return [];

    const potentialMatches = await this.findSimilarUsers(request.userId);

    return potentialMatches.map((matchUserId, index) => ({
      itemId: matchUserId,
      score: 1 - index * 0.1,
      reasons: ['Similar preferences', 'Compatible location'],
      confidence: 0.8,
      metadata: {},
    }));
  }

  private async recommendTrending(request: RecommendationRequest): Promise<Recommendation[]> {
    const key = 'recommendations:trending:properties';
    const cached = await this.cacheManager.get<Recommendation[]>(key);
    if (cached) return cached;

    const trendingItems = await this.getTrendingItems();
    await this.cacheManager.set(key, trendingItems, 600000); // 10 min cache
    
    return trendingItems;
  }

  private async getCollaborativeFilteringScores(userId: string): Promise<Map<string, number>> {
    const scores = new Map<string, number>();
    
    const similarUsers = await this.findSimilarUsers(userId);
    const userInteractions = await this.getUserInteractions(userId);

    for (const similarUserId of similarUsers.slice(0, 20)) {
      const theirInteractions = await this.getUserInteractions(similarUserId);
      
      theirInteractions.forEach((interaction) => {
        if (!userInteractions.has(interaction.itemId)) {
          const weight = this.getInteractionWeight(interaction.interaction);
          const existing = scores.get(interaction.itemId) || 0;
          scores.set(interaction.itemId, existing + weight);
        }
      });
    }

    return scores;
  }

  private async getContentBasedScores(
    userId: string,
    preferences: UserPreferences | null,
  ): Promise<Map<string, number>> {
    const scores = new Map<string, number>();
    
    if (!preferences) return scores;

    const allItems = await this.getAllAvailableItems();

    allItems.forEach((itemId) => {
      let score = 0;

      score += this.calculateFeatureSimilarity(itemId, preferences) * 100;
      
      const recencyBoost = Math.random() * 10;
      score += recencyBoost;

      scores.set(itemId, score);
    });

    return scores;
  }

  private async applyContextualBoost(
    context: any,
    scores: Map<string, number>,
  ): Promise<Map<string, number>> {
    const boostedScores = new Map(scores);

    if (context.priceRange) {
      boostedScores.forEach((score, itemId) => {
        const inRange = this.isInPriceRange(itemId, context.priceRange);
        if (inRange) {
          boostedScores.set(itemId, score * 1.2);
        } else {
          boostedScores.set(itemId, score * 0.7);
        }
      });
    }

    if (context.location) {
      boostedScores.forEach((score, itemId) => {
        const distance = this.calculateDistanceToItem(itemId, context.location);
        if (distance < context.location.radius) {
          boostedScores.set(itemId, score * 1.3);
        }
      });
    }

    return boostedScores;
  }

  private diversifyRecommendations(recommendations: Recommendation[]): Recommendation[] {
    const diversified: Recommendation[] = [];
    const seenTypes = new Set<string>();

    for (const rec of recommendations) {
      const type = this.getItemType(rec.itemId);
      
      if (diversified.length < 3 || !seenTypes.has(type) || seenTypes.size >= 4) {
        diversified.push(rec);
        seenTypes.add(type);
      }

      if (diversified.length >= 20) break;
    }

    return diversified;
  }

  private generateReasons(itemId: string, preferences: UserPreferences | null): string[] {
    const reasons: string[] = [];

    if (preferences) {
      if (Math.random() > 0.5) {
        reasons.push('Matches your preferences');
      }
      if (Math.random() > 0.6) {
        reasons.push('Popular in your area');
      }
      if (Math.random() > 0.7) {
        reasons.push('Similar to properties you liked');
      }
    }

    return reasons.length > 0 ? reasons : ['Recommended for you'];
  }

  private async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    const key = `recommendations:preferences:${userId}`;
    return await this.cacheManager.get<UserPreferences>(key);
  }

  private async getUserProfile(userId: string): Promise<any> {
    const key = `recommendations:profile:${userId}`;
    return await this.cacheManager.get(key);
  }

  private async findSimilarUsers(userId: string): Promise<string[]> {
    const key = `recommendations:similar_users:${userId}`;
    const cached = await this.cacheManager.get<string[]>(key);
    if (cached) return cached;

    const similarUsers = [`user-${Math.random()}`, `user-${Math.random()}`];
    await this.cacheManager.set(key, similarUsers, 3600000);
    return similarUsers;
  }

  private async findSimilarItems(itemId: string): Promise<Recommendation[]> {
    return Array.from({ length: 5 }, (_, i) => ({
      itemId: `property-${i}-${Math.random()}`,
      score: 0.9 - i * 0.15,
      reasons: ['Similar features', 'Same price range'],
      confidence: 0.85,
      metadata: {},
    }));
  }

  private async getUserInteractions(userId: string): Promise<Set<CollaborativeFilteringData>> {
    const key = `recommendations:interactions:${userId}`;
    const cached = await this.cacheManager.get<CollaborativeFilteringData[]>(key);
    return new Set(cached || []);
  }

  private async getAllAvailableItems(): Promise<string[]> {
    return Array.from({ length: 50 }, (_, i) => `property-${i}`);
  }

  private async getTrendingItems(): Promise<Recommendation[]> {
    return Array.from({ length: 10 }, (_, i) => ({
      itemId: `trending-property-${i}`,
      score: 1 - i * 0.08,
      reasons: ['Trending now', 'High user engagement'],
      confidence: 0.9,
      metadata: { views: 1000 - i * 50 },
    }));
  }

  private getInteractionWeight(type: string): number {
    const weights = {
      view: 1,
      favorite: 3,
      inquiry: 5,
      booking: 10,
    };
    return weights[type as keyof typeof weights] || 1;
  }

  private calculateFeatureSimilarity(itemId: string, preferences: UserPreferences): number {
    return Math.random() * 0.8 + 0.2;
  }

  private isInPriceRange(itemId: string, priceRange: { min: number; max: number }): boolean {
    return Math.random() > 0.3;
  }

  private calculateDistanceToItem(itemId: string, location: any): number {
    return Math.random() * 50;
  }

  private getItemType(itemId: string): string {
    const types = ['apartment', 'house', 'commercial', 'land'];
    return types[Math.floor(Math.random() * types.length)];
  }

  private buildCacheKey(request: RecommendationRequest): string {
    return `recommendations:${request.type}:${request.userId}:${JSON.stringify(request.context)}`;
  }

  async recordInteraction(data: CollaborativeFilteringData): Promise<void> {
    const key = `recommendations:interactions:${data.userId}`;
    const interactions = await this.cacheManager.get<CollaborativeFilteringData[]>(key) || [];
    interactions.push(data);
    await this.cacheManager.set(key, interactions, 86400000 * 30);
  }

  async updateUserPreferences(userId: string, preferences: UserPreferences): Promise<void> {
    const key = `recommendations:preferences:${userId}`;
    await this.cacheManager.set(key, preferences, 86400000 * 30);
  }
}
