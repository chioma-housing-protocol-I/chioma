export enum RecommendationType {
  PROPERTY = 'property',
  USER_MATCH = 'user_match',
  SIMILAR_LISTINGS = 'similar_listings',
  TRENDING = 'trending',
}

export interface RecommendationRequest {
  userId: string;
  type: RecommendationType;
  limit?: number;
  filters?: Record<string, any>;
  context?: RecommendationContext;
}

export interface RecommendationContext {
  currentPropertyId?: string;
  searchQuery?: string;
  priceRange?: {
    min: number;
    max: number;
  };
  location?: {
    latitude: number;
    longitude: number;
    radius?: number;
  };
  propertyType?: string;
  bedrooms?: number;
}

export interface Recommendation {
  itemId: string;
  score: number;
  reasons: string[];
  confidence: number;
  metadata?: Record<string, any>;
}

export interface RecommendationResult {
  userId: string;
  type: RecommendationType;
  recommendations: Recommendation[];
  algorithm: string;
  generatedAt: Date;
  totalAvailable: number;
}

export interface UserPreferences {
  userId: string;
  propertyTypes: string[];
  priceRange: {
    min: number;
    max: number;
  };
  locations: string[];
  bedrooms?: number;
  amenities: string[];
  keywords: string[];
}

export interface CollaborativeFilteringData {
  userId: string;
  itemId: string;
  interaction: 'view' | 'favorite' | 'inquiry' | 'booking';
  timestamp: Date;
  durationSeconds?: number;
}

export interface ContentFeatures {
  itemId: string;
  features: Record<string, number | string | boolean>;
  embeddings?: number[];
}
