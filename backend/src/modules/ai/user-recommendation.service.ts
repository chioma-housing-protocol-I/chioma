import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { UserPreferences } from './entities/user-preferences.entity';
import {
  Property,
  ListingStatus,
} from '../properties/entities/property.entity';
import { Favorite } from '../favorites/entities/favorite.entity';
import { SavedSearch } from '../search/entities/saved-search.entity';
import {
  PropertyCandidate,
  RecommendationEngineService,
  UserPreference,
} from './recommendation-engine.service';

const CANDIDATE_LIMIT = 200;

/** Returns the most frequent non-empty value, or undefined. */
function mode<T>(values: (T | null | undefined)[]): T | undefined {
  const counts = new Map<T, number>();
  for (const v of values) {
    if (v === null || v === undefined || v === '') continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  let best: T | undefined;
  let bestCount = 0;
  counts.forEach((count, v) => {
    if (count > bestCount) {
      best = v;
      bestCount = count;
    }
  });
  return best;
}

@Injectable()
export class UserRecommendationService {
  constructor(
    private readonly engine: RecommendationEngineService,
    @InjectRepository(UserPreferences)
    private readonly preferencesRepo: Repository<UserPreferences>,
    @InjectRepository(Property)
    private readonly propertyRepo: Repository<Property>,
    @InjectRepository(Favorite)
    private readonly favoriteRepo: Repository<Favorite>,
    @InjectRepository(SavedSearch)
    private readonly savedSearchRepo: Repository<SavedSearch>,
  ) {}

  /**
   * Merges stored preferences, favorites and recent saved-search filters into
   * one preference profile. Explicit stored preferences win over inferred ones.
   */
  async gatherSignals(
    userId: string,
  ): Promise<{ preferences: UserPreference; favoritedIds: string[] }> {
    const [stored, favorites, searches] = await Promise.all([
      this.preferencesRepo.findOne({ where: { userId } }),
      this.favoriteRepo.find({
        where: { userId },
        relations: ['property', 'property.amenities'],
        order: { createdAt: 'DESC' },
        take: 50,
      }),
      this.savedSearchRepo.find({
        where: { userId },
        order: { updatedAt: 'DESC' },
        take: 10,
      }),
    ]);

    const favProps = favorites.map((f) => f.property).filter(Boolean);
    const filters = searches.map((s) => s.filters ?? {});

    const rents = [
      ...favProps.map((p) => Number(p.price)),
      ...filters.map((f) => Number(f.maxPrice)),
    ].filter((n) => Number.isFinite(n) && n > 0);

    const amenities = new Set<string>([
      ...favProps.flatMap((p) => (p.amenities ?? []).map((a) => a.name)),
      ...filters.flatMap((f) => f.amenities ?? []),
    ]);

    const preferences: UserPreference = {
      preferredCity:
        stored?.preferredCity ??
        mode([...filters.map((f) => f.city), ...favProps.map((p) => p.city)]),
      maxBudget:
        (stored?.maxBudget != null ? Number(stored.maxBudget) : undefined) ??
        (rents.length ? Math.max(...rents) : undefined),
      bedrooms:
        stored?.bedrooms ??
        mode([
          ...filters.map((f) => f.bedrooms),
          ...favProps.map((p) => p.bedrooms),
        ]),
      preferredAmenities: stored?.preferredAmenities?.length
        ? stored.preferredAmenities
        : [...amenities],
    };

    return { preferences, favoritedIds: favorites.map((f) => f.propertyId) };
  }

  async recommendForUser(userId: string, limit = 10) {
    const { preferences, favoritedIds } = await this.gatherSignals(userId);

    const properties = await this.propertyRepo.find({
      where: {
        status: ListingStatus.PUBLISHED,
        ownerId: Not(userId),
        ...(favoritedIds.length ? { id: Not(In(favoritedIds)) } : {}),
      },
      relations: ['amenities', 'images'],
      order: { createdAt: 'DESC' },
      take: CANDIDATE_LIMIT,
    });

    const byId = new Map(properties.map((p) => [p.id, p]));
    const candidates: PropertyCandidate[] = properties.map((p) => ({
      propertyId: p.id,
      city: p.city,
      monthlyRent: Number(p.price),
      bedrooms: p.bedrooms ?? 0,
      amenities: (p.amenities ?? []).map((a) => a.name),
    }));

    const scored = this.engine
      .recommend(preferences, candidates)
      .slice(0, Math.max(1, Math.min(50, limit)));

    return {
      preferences,
      recommendations: scored.map((r) => {
        const p = byId.get(r.propertyId)!;
        return {
          ...r,
          title: p.title,
          currency: p.currency,
          imageUrl: p.images?.[0]?.url ?? null,
        };
      }),
    };
  }
}
