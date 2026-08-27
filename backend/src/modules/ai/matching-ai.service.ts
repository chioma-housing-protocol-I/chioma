import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Property,
  ListingStatus,
  PropertyType,
} from '../properties/entities/property.entity';
import { PropertyAmenity } from '../properties/entities/property-amenity.entity';
import { UserPreferences } from './entities/user-preferences.entity';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { CacheService } from '../../common/cache/cache.service';

const CACHE_TTL_RECOMMENDATIONS = 5 * 60 * 1000; // 5 min
const CACHE_TTL_SIMILAR = 10 * 60 * 1000; // 10 min

@Injectable()
export class MatchingAiService {
  private readonly logger = new Logger(MatchingAiService.name);

  constructor(
    @InjectRepository(Property)
    private readonly propertyRepo: Repository<Property>,
    @InjectRepository(UserPreferences)
    private readonly preferencesRepo: Repository<UserPreferences>,
    private readonly cacheService: CacheService,
  ) {}

  // ─── Scoring ────────────────────────────────────────────────────────────────

  private scoreProperty(
    property: Property,
    amenityNames: string[],
    prefs: UserPreferences,
  ): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];

    if (
      prefs.preferredCity &&
      property.city?.toLowerCase() === prefs.preferredCity.toLowerCase()
    ) {
      score += 30;
      reasons.push('city_match');
    }

    if (prefs.maxBudget && Number(property.price) <= Number(prefs.maxBudget)) {
      score += 25;
      reasons.push('within_budget');
    }

    if (prefs.minBudget && Number(property.price) >= Number(prefs.minBudget)) {
      score += 5;
      reasons.push('above_min_budget');
    }

    if (prefs.bedrooms && property.bedrooms >= prefs.bedrooms) {
      score += 15;
      reasons.push('bedroom_match');
    }

    if (prefs.bathrooms && property.bathrooms >= prefs.bathrooms) {
      score += 10;
      reasons.push('bathroom_match');
    }

    if (
      prefs.preferredType &&
      property.type === (prefs.preferredType as PropertyType)
    ) {
      score += 10;
      reasons.push('type_match');
    }

    if (prefs.petsRequired && property.petsAllowed) {
      score += 8;
      reasons.push('pets_allowed');
    } else if (prefs.petsRequired && !property.petsAllowed) {
      score -= 20; // hard penalty
    }

    if (prefs.parkingRequired && property.hasParking) {
      score += 8;
      reasons.push('parking_available');
    } else if (prefs.parkingRequired && !property.hasParking) {
      score -= 15;
    }

    if (prefs.furnishedRequired && property.isFurnished) {
      score += 5;
      reasons.push('furnished');
    }

    if (prefs.preferredAmenities?.length) {
      const matched = prefs.preferredAmenities.filter((a) =>
        amenityNames.some((n) => n.toLowerCase().includes(a.toLowerCase())),
      );
      const amenityScore = Math.min(15, matched.length * 3);
      if (amenityScore > 0) {
        score += amenityScore;
        reasons.push('amenity_match');
      }
    }

    return { score: Math.max(0, score), reasons };
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  async getRecommendations(userId: string, limit = 10) {
    const cacheKey = `ai:recommendations:${userId}:${limit}`;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const prefs = await this.preferencesRepo.findOne({ where: { userId } });

        const properties = await this.propertyRepo.find({
          where: { status: ListingStatus.PUBLISHED },
          relations: ['amenities'],
          take: 500, // cap for scoring pass
        });

        if (!prefs) {
          // Cold-start: return latest published properties
          return properties.slice(0, limit).map((p) => ({
            propertyId: p.id,
            title: p.title,
            city: p.city,
            price: p.price,
            bedrooms: p.bedrooms,
            score: 0,
            matchPercentage: 0,
            reasons: ['no_preferences_set'],
          }));
        }

        const scored = properties.map((p) => {
          const amenityNames = (p.amenities ?? []).map(
            (a: PropertyAmenity) => a.name,
          );
          const { score, reasons } = this.scoreProperty(p, amenityNames, prefs);
          return {
            propertyId: p.id,
            title: p.title,
            city: p.city,
            price: p.price,
            bedrooms: p.bedrooms,
            type: p.type,
            score,
            matchPercentage: Math.min(100, score),
            reasons,
          };
        });

        return scored.sort((a, b) => b.score - a.score).slice(0, limit);
      },
      CACHE_TTL_RECOMMENDATIONS,
    );
  }

  async getMatchScore(userId: string, propertyId: string) {
    const [prefs, property] = await Promise.all([
      this.preferencesRepo.findOne({ where: { userId } }),
      this.propertyRepo.findOne({
        where: { id: propertyId },
        relations: ['amenities'],
      }),
    ]);

    if (!property) {
      return {
        propertyId,
        score: 0,
        matchPercentage: 0,
        reasons: ['property_not_found'],
      };
    }

    if (!prefs) {
      return {
        propertyId,
        score: 0,
        matchPercentage: 0,
        reasons: ['no_preferences_set'],
      };
    }

    const amenityNames = (property.amenities ?? []).map(
      (a: PropertyAmenity) => a.name,
    );
    const { score, reasons } = this.scoreProperty(
      property,
      amenityNames,
      prefs,
    );

    return {
      propertyId,
      score,
      matchPercentage: Math.min(100, score),
      reasons,
    };
  }

  async getSimilarProperties(propertyId: string, limit = 5) {
    const cacheKey = `ai:similar:${propertyId}:${limit}`;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const source = await this.propertyRepo.findOne({
          where: { id: propertyId },
          relations: ['amenities'],
        });

        if (!source) return [];

        const candidates = await this.propertyRepo.find({
          where: { status: ListingStatus.PUBLISHED, city: source.city },
          relations: ['amenities'],
          take: 200,
        });

        const sourceAmenities = (source.amenities ?? []).map(
          (a: PropertyAmenity) => a.name,
        );

        const scored = candidates
          .filter((p) => p.id !== propertyId)
          .map((p) => {
            let score = 0;

            if (p.type === source.type) score += 30;
            if (p.bedrooms === source.bedrooms) score += 20;
            if (p.bathrooms === source.bathrooms) score += 10;
            if (p.isFurnished === source.isFurnished) score += 5;
            if (p.petsAllowed === source.petsAllowed) score += 5;
            if (p.hasParking === source.hasParking) score += 5;

            // Price proximity: within 20% range
            const priceDiff =
              Math.abs(Number(p.price) - Number(source.price)) /
              Number(source.price);
            if (priceDiff <= 0.1) score += 20;
            else if (priceDiff <= 0.2) score += 10;

            // Amenity overlap
            const pAmenities = (p.amenities ?? []).map(
              (a: PropertyAmenity) => a.name,
            );
            const overlap = sourceAmenities.filter((a) =>
              pAmenities.includes(a),
            ).length;
            score += Math.min(10, overlap * 2);

            return {
              propertyId: p.id,
              title: p.title,
              city: p.city,
              price: p.price,
              bedrooms: p.bedrooms,
              type: p.type,
              similarityScore: score,
            };
          });

        return scored
          .sort((a, b) => b.similarityScore - a.similarityScore)
          .slice(0, limit);
      },
      CACHE_TTL_SIMILAR,
    );
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    let prefs = await this.preferencesRepo.findOne({ where: { userId } });

    if (!prefs) {
      prefs = this.preferencesRepo.create({ userId, ...dto });
    } else {
      Object.assign(prefs, dto);
    }

    const saved = await this.preferencesRepo.save(prefs);

    // Bust recommendation cache on preference update
    await this.cacheService.invalidate(`ai:recommendations:${userId}:*`);

    return saved;
  }

  async getPreferences(userId: string) {
    return this.preferencesRepo.findOne({ where: { userId } }) ?? null;
  }
}
