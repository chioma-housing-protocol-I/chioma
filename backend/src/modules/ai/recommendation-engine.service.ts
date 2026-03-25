import { Injectable } from '@nestjs/common';

export interface PropertyCandidate {
  propertyId: string;
  city: string;
  monthlyRent: number;
  bedrooms: number;
  amenities: string[];
}

export interface UserPreference {
  preferredCity?: string;
  maxBudget?: number;
  bedrooms?: number;
  preferredAmenities?: string[];
}

@Injectable()
export class RecommendationEngineService {
  recommend(
    preferences: UserPreference,
    candidates: PropertyCandidate[],
  ): Array<PropertyCandidate & { score: number; reasons: string[] }> {
    return candidates
      .map((candidate) => {
        let score = 0;
        const reasons: string[] = [];

        if (
          preferences.preferredCity &&
          candidate.city === preferences.preferredCity
        ) {
          score += 35;
          reasons.push('city_match');
        }
        if (
          preferences.maxBudget &&
          candidate.monthlyRent <= preferences.maxBudget
        ) {
          score += 25;
          reasons.push('within_budget');
        }
        if (
          preferences.bedrooms &&
          candidate.bedrooms >= preferences.bedrooms
        ) {
          score += 20;
          reasons.push('bedroom_match');
        }

        if (preferences.preferredAmenities?.length) {
          const amenityMatches = preferences.preferredAmenities.filter(
            (amenity) => candidate.amenities.includes(amenity),
          ).length;
          const amenityScore = Math.min(20, amenityMatches * 5);
          if (amenityScore > 0) {
            score += amenityScore;
            reasons.push('amenity_match');
          }
        }

        return { ...candidate, score, reasons };
      })
      .sort((a, b) => b.score - a.score);
  }
}
