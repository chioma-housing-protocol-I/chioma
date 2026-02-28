import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import {
  Property,
  PropertyType,
  ListingStatus,
} from '../properties/entities/property.entity';

export interface SearchFilters {
  query?: string;
  city?: string;
  state?: string;
  country?: string;
  type?: PropertyType;
  status?: ListingStatus;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  isFurnished?: boolean;
  hasParking?: boolean;
  petsAllowed?: boolean;
  // Geospatial
  lat?: number;
  lng?: number;
  radiusKm?: number;
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  facets: SearchFacets;
}

export interface SearchFacets {
  types: Array<{ type: string; count: number }>;
  cities: Array<{ city: string; count: number }>;
  priceRanges: Array<{
    label: string;
    min: number;
    max: number;
    count: number;
  }>;
  amenities: {
    furnished: number;
    parking: number;
    petsAllowed: number;
  };
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    @InjectRepository(Property)
    private readonly propertyRepo: Repository<Property>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async searchProperties(
    filters: SearchFilters,
    page = 1,
    limit = 20,
  ): Promise<SearchResult<Property>> {
    const cacheKey = `search:properties:${JSON.stringify({ filters, page, limit })}`;
    const cached =
      await this.cacheManager.get<SearchResult<Property>>(cacheKey);
    if (cached) return cached;

    const qb = this.buildPropertyQuery(filters);
    const countQb = this.buildPropertyQuery(filters);

    // Pagination
    qb.skip((page - 1) * limit).take(limit);
    qb.orderBy('property.createdAt', 'DESC');

    const [items, total] = await Promise.all([
      qb.getMany(),
      countQb.getCount(),
    ]);

    const facets = await this.buildFacets(filters);

    const result: SearchResult<Property> = {
      items,
      total,
      page,
      limit,
      facets,
    };
    await this.cacheManager.set(cacheKey, result, 120); // cache 2min

    return result;
  }

  async suggest(partialQuery: string, limit = 10): Promise<string[]> {
    if (!partialQuery || partialQuery.length < 2) return [];

    const cacheKey = `suggest:${partialQuery}`;
    const cached = await this.cacheManager.get<string[]>(cacheKey);
    if (cached) return cached;

    const results = await this.propertyRepo
      .createQueryBuilder('property')
      .select(['property.title', 'property.city', 'property.address'])
      .where(
        'property.title ILIKE :q OR property.city ILIKE :q OR property.address ILIKE :q',
        {
          q: `${partialQuery}%`,
        },
      )
      .andWhere('property.status = :status', {
        status: ListingStatus.PUBLISHED,
      })
      .limit(limit)
      .getMany();

    const suggestions = [
      ...new Set([
        ...results.map((p) => p.title),
        ...results.map((p) => p.city).filter(Boolean),
      ]),
    ].slice(0, limit);

    await this.cacheManager.set(cacheKey, suggestions, 300);
    return suggestions;
  }

  private buildPropertyQuery(
    filters: SearchFilters,
  ): SelectQueryBuilder<Property> {
    const qb = this.propertyRepo
      .createQueryBuilder('property')
      .leftJoinAndSelect('property.images', 'images')
      .leftJoinAndSelect('property.amenities', 'amenities');

    // Full-text search
    if (filters.query) {
      qb.andWhere(
        `(to_tsvector('english', property.title || ' ' || COALESCE(property.description, '')) @@ plainto_tsquery('english', :query) OR property.address ILIKE :likeQuery)`,
        { query: filters.query, likeQuery: `%${filters.query}%` },
      );
    }

    if (filters.city) {
      qb.andWhere('property.city ILIKE :city', { city: `%${filters.city}%` });
    }
    if (filters.state) {
      qb.andWhere('property.state ILIKE :state', {
        state: `%${filters.state}%`,
      });
    }
    if (filters.country) {
      qb.andWhere('property.country = :country', { country: filters.country });
    }
    if (filters.type) {
      qb.andWhere('property.type = :type', { type: filters.type });
    }
    if (filters.status) {
      qb.andWhere('property.status = :status', { status: filters.status });
    } else {
      qb.andWhere('property.status = :status', {
        status: ListingStatus.PUBLISHED,
      });
    }
    if (filters.minPrice !== undefined) {
      qb.andWhere('property.price >= :minPrice', {
        minPrice: filters.minPrice,
      });
    }
    if (filters.maxPrice !== undefined) {
      qb.andWhere('property.price <= :maxPrice', {
        maxPrice: filters.maxPrice,
      });
    }
    if (filters.bedrooms !== undefined) {
      qb.andWhere('property.bedrooms >= :bedrooms', {
        bedrooms: filters.bedrooms,
      });
    }
    if (filters.bathrooms !== undefined) {
      qb.andWhere('property.bathrooms >= :bathrooms', {
        bathrooms: filters.bathrooms,
      });
    }
    if (filters.isFurnished !== undefined) {
      qb.andWhere('property.is_furnished = :isFurnished', {
        isFurnished: filters.isFurnished,
      });
    }
    if (filters.hasParking !== undefined) {
      qb.andWhere('property.has_parking = :hasParking', {
        hasParking: filters.hasParking,
      });
    }
    if (filters.petsAllowed !== undefined) {
      qb.andWhere('property.pets_allowed = :petsAllowed', {
        petsAllowed: filters.petsAllowed,
      });
    }

    // Geospatial radius filter (Haversine)
    if (
      filters.lat !== undefined &&
      filters.lng !== undefined &&
      filters.radiusKm !== undefined
    ) {
      qb.andWhere(
        `(6371 * acos(cos(radians(:lat)) * cos(radians(CAST(property.latitude AS float))) * cos(radians(CAST(property.longitude AS float)) - radians(:lng)) + sin(radians(:lat)) * sin(radians(CAST(property.latitude AS float))))) <= :radius`,
        { lat: filters.lat, lng: filters.lng, radius: filters.radiusKm },
      );
    }

    return qb;
  }

  private async buildFacets(baseFilters: SearchFilters): Promise<SearchFacets> {
    // Run facet queries in parallel for speed
    const baseQb = () => {
      const qb = this.propertyRepo.createQueryBuilder('property');
      if (baseFilters.query) {
        qb.andWhere(
          `to_tsvector('english', property.title || ' ' || COALESCE(property.description, '')) @@ plainto_tsquery('english', :query)`,
          { query: baseFilters.query },
        );
      }
      qb.andWhere('property.status = :status', {
        status: ListingStatus.PUBLISHED,
      });
      return qb;
    };

    const [typeFacets, cityFacets, amenityCounts] = await Promise.all([
      baseQb()
        .select('property.type', 'type')
        .addSelect('COUNT(*)', 'count')
        .groupBy('property.type')
        .getRawMany(),
      baseQb()
        .select('property.city', 'city')
        .addSelect('COUNT(*)', 'count')
        .groupBy('property.city')
        .orderBy('count', 'DESC')
        .limit(10)
        .getRawMany(),
      baseQb()
        .select([
          'SUM(CASE WHEN property.is_furnished = true THEN 1 ELSE 0 END) as furnished',
          'SUM(CASE WHEN property.has_parking = true THEN 1 ELSE 0 END) as parking',
          'SUM(CASE WHEN property.pets_allowed = true THEN 1 ELSE 0 END) as pets_allowed',
        ])
        .getRawOne(),
    ]);

    return {
      types: typeFacets.map((r) => ({
        type: r.type,
        count: parseInt(r.count),
      })),
      cities: cityFacets.map((r) => ({
        city: r.city,
        count: parseInt(r.count),
      })),
      priceRanges: [
        { label: 'Under $500', min: 0, max: 500, count: 0 },
        { label: '$500-$1000', min: 500, max: 1000, count: 0 },
        { label: '$1000-$2000', min: 1000, max: 2000, count: 0 },
        { label: 'Over $2000', min: 2000, max: 999999, count: 0 },
      ],
      amenities: {
        furnished: parseInt(amenityCounts?.furnished) || 0,
        parking: parseInt(amenityCounts?.parking) || 0,
        petsAllowed: parseInt(amenityCounts?.pets_allowed) || 0,
      },
    };
  }
}
