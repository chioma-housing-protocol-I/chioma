import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import {
  Property,
  PropertyType,
  ListingStatus,
} from '../properties/entities/property.entity';
import { User, UserRole } from '../users/entities/user.entity';
import {
  RentAgreement,
  AgreementStatus,
} from '../rent/entities/rent-contract.entity';
import { CacheService } from '../../common/cache/cache.service';
import {
  CACHE_PREFIX_SEARCH_PROPERTIES,
  CACHE_PREFIX_SUGGEST,
  TTL_SEARCH_RESULTS_MS,
  TTL_SUGGEST_MS,
} from '../../common/cache/cache.constants';

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
  amenities?: string[];
  // Geospatial
  lat?: number;
  lng?: number;
  radiusKm?: number;
  // Sort
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UserSearchFilters {
  query?: string;
  role?: UserRole;
  isActive?: boolean;
  kycVerified?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DocumentSearchFilters {
  query?: string;
  status?: AgreementStatus;
  propertyId?: string;
  userId?: string;
  adminId?: string;
  minRent?: number;
  maxRent?: number;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
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
  constructor(
    @InjectRepository(Property)
    private readonly propertyRepo: Repository<Property>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(RentAgreement)
    private readonly agreementRepo: Repository<RentAgreement>,
    private readonly cacheService: CacheService,
  ) {}

  async searchProperties(
    filters: SearchFilters,
    page = 1,
    limit = 20,
  ): Promise<SearchResult<Property>> {
    const cacheKey = `${CACHE_PREFIX_SEARCH_PROPERTIES}:${JSON.stringify({ filters, page, limit })}`;
    return this.cacheService.getOrSet(
      cacheKey,
      () => this.executeSearchProperties(filters, page, limit),
      TTL_SEARCH_RESULTS_MS,
    );
  }

  private async executeSearchProperties(
    filters: SearchFilters,
    page: number,
    limit: number,
  ): Promise<SearchResult<Property>> {
    const qb = this.buildPropertyQuery(filters);
    const countQb = this.buildPropertyQuery(filters);

    qb.skip((page - 1) * limit).take(limit);
    qb.orderBy('property.createdAt', 'DESC');

    const [items, total] = await Promise.all([
      qb.getMany(),
      countQb.getCount(),
    ]);

    const facets = await this.buildFacets(filters);

    return {
      items,
      total,
      page,
      limit,
      facets,
    };
  }

  async suggest(partialQuery: string, limit = 10): Promise<string[]> {
    if (!partialQuery || partialQuery.length < 2) return [];

    const cacheKey = `${CACHE_PREFIX_SUGGEST}:${partialQuery}`;
    return this.cacheService.getOrSet(
      cacheKey,
      () => this.executeSuggest(partialQuery, limit),
      TTL_SUGGEST_MS,
    );
  }

  private async executeSuggest(
    partialQuery: string,
    limit: number,
  ): Promise<string[]> {
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

    return [
      ...new Set([
        ...results.map((p) => p.title),
        ...results.map((p) => p.city).filter(Boolean),
      ]),
    ].slice(0, limit);
  }

  private buildPropertyQuery(
    filters: SearchFilters,
  ): SelectQueryBuilder<Property> {
    const qb = this.propertyRepo
      .createQueryBuilder('property')
      .leftJoinAndSelect('property.images', 'images')
      .leftJoinAndSelect('property.amenities', 'amenities');

    // Full-text search using indexed search_vector column
    if (filters.query) {
      qb.andWhere(
        `(property.search_vector @@ plainto_tsquery('english', :query) OR property.address ILIKE :likeQuery)`,
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

    // Amenity name filtering (indexed on property_amenities.name)
    if (filters.amenities && filters.amenities.length > 0) {
      qb.andWhere((subQb) => {
        const sub = subQb
          .subQuery()
          .select('pa.property_id')
          .from('property_amenities', 'pa')
          .where('LOWER(pa.name) IN (:...amenityNames)')
          .groupBy('pa.property_id')
          .having('COUNT(DISTINCT LOWER(pa.name)) = :amenityCount')
          .getQuery();
        return 'property.id IN ' + sub;
      });
      qb.setParameter(
        'amenityNames',
        filters.amenities.map((a) => a.toLowerCase()),
      );
      qb.setParameter('amenityCount', filters.amenities.length);
    }

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
    const baseQb = () => {
      const qb = this.propertyRepo.createQueryBuilder('property');
      if (baseFilters.query) {
        qb.andWhere(
          `property.search_vector @@ plainto_tsquery('english', :query)`,
          { query: baseFilters.query },
        );
      }
      qb.andWhere('property.status = :status', {
        status: ListingStatus.PUBLISHED,
      });
      return qb;
    };

    const priceRangeDefs = [
      { label: 'Under $500', min: 0, max: 500 },
      { label: '$500-$1000', min: 500, max: 1000 },
      { label: '$1000-$2000', min: 1000, max: 2000 },
      { label: 'Over $2000', min: 2000, max: 999999 },
    ];

    const [typeFacets, cityFacets, amenityCounts, priceRangeCounts] =
      await Promise.all([
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
        // Count properties in each price bucket in a single query
        baseQb()
          .select(
            `SUM(CASE WHEN CAST(property.price AS float) < 500 THEN 1 ELSE 0 END)`,
            'range0',
          )
          .addSelect(
            `SUM(CASE WHEN CAST(property.price AS float) >= 500 AND CAST(property.price AS float) < 1000 THEN 1 ELSE 0 END)`,
            'range1',
          )
          .addSelect(
            `SUM(CASE WHEN CAST(property.price AS float) >= 1000 AND CAST(property.price AS float) < 2000 THEN 1 ELSE 0 END)`,
            'range2',
          )
          .addSelect(
            `SUM(CASE WHEN CAST(property.price AS float) >= 2000 THEN 1 ELSE 0 END)`,
            'range3',
          )
          .getRawOne(),
      ]);

    const priceRanges = priceRangeDefs.map((def, i) => ({
      ...def,
      count: parseInt(priceRangeCounts?.[`range${i}`] ?? '0') || 0,
    }));

    return {
      types: typeFacets.map((r) => ({
        type: r.type,
        count: parseInt(r.count),
      })),
      cities: cityFacets.map((r) => ({
        city: r.city,
        count: parseInt(r.count),
      })),
      priceRanges,
      amenities: {
        furnished: parseInt(amenityCounts?.furnished) || 0,
        parking: parseInt(amenityCounts?.parking) || 0,
        petsAllowed: parseInt(amenityCounts?.pets_allowed) || 0,
      },
    };
  }

  // ─── Users ──────────────────────────────────────────────────────────────────

  async searchUsers(
    filters: UserSearchFilters,
    page = 1,
    limit = 20,
  ): Promise<{ items: User[]; total: number; page: number; limit: number }> {
    const qb = this.buildUserQuery(filters);

    qb.skip((page - 1) * limit).take(limit);

    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'desc';
    const allowedSortFields = [
      'createdAt',
      'firstName',
      'lastName',
      'email',
      'role',
    ];
    const safeSortBy = allowedSortFields.includes(sortBy)
      ? sortBy
      : 'createdAt';
    qb.orderBy(`user.${safeSortBy}`, sortOrder.toUpperCase() as 'ASC' | 'DESC');

    const [items, total] = await qb.getManyAndCount();

    return { items, total, page, limit };
  }

  private buildUserQuery(filters: UserSearchFilters): SelectQueryBuilder<User> {
    const qb = this.userRepo.createQueryBuilder('user');

    if (filters.query) {
      qb.andWhere(
        `(LOWER(user.firstName) ILIKE :query OR LOWER(user.lastName) ILIKE :query OR LOWER(user.email) ILIKE :query)`,
        { query: `%${filters.query.toLowerCase()}%` },
      );
    }

    if (filters.role) {
      qb.andWhere('user.role = :role', { role: filters.role });
    }

    if (filters.isActive !== undefined) {
      qb.andWhere('user.isActive = :isActive', { isActive: filters.isActive });
    }

    if (filters.kycVerified !== undefined) {
      qb.andWhere(
        filters.kycVerified
          ? "user.kycStatus = 'APPROVED'"
          : "user.kycStatus != 'APPROVED'",
      );
    }

    return qb;
  }

  // ─── Documents (Agreements) ─────────────────────────────────────────────────

  async searchDocuments(
    filters: DocumentSearchFilters,
    page = 1,
    limit = 20,
  ): Promise<{
    items: RentAgreement[];
    total: number;
    page: number;
    limit: number;
  }> {
    const qb = this.buildDocumentQuery(filters);

    qb.skip((page - 1) * limit).take(limit);

    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'desc';
    const allowedSortFields = [
      'createdAt',
      'startDate',
      'endDate',
      'monthlyRent',
      'status',
    ];
    const safeSortBy = allowedSortFields.includes(sortBy)
      ? sortBy
      : 'createdAt';
    qb.orderBy(
      `agreement.${safeSortBy}`,
      sortOrder.toUpperCase() as 'ASC' | 'DESC',
    );

    const [items, total] = await qb.getManyAndCount();

    return { items, total, page, limit };
  }

  private buildDocumentQuery(
    filters: DocumentSearchFilters,
  ): SelectQueryBuilder<RentAgreement> {
    const qb = this.agreementRepo.createQueryBuilder('agreement');

    if (filters.query) {
      qb.andWhere(
        `(LOWER(agreement.agreementNumber) ILIKE :query OR LOWER(agreement.termsAndConditions) ILIKE :query)`,
        { query: `%${filters.query.toLowerCase()}%` },
      );
    }

    if (filters.status) {
      qb.andWhere('agreement.status = :status', { status: filters.status });
    }

    if (filters.propertyId) {
      qb.andWhere('agreement.propertyId = :propertyId', {
        propertyId: filters.propertyId,
      });
    }

    if (filters.userId) {
      qb.andWhere('agreement.userId = :userId', { userId: filters.userId });
    }

    if (filters.adminId) {
      qb.andWhere('agreement.adminId = :adminId', { adminId: filters.adminId });
    }

    if (filters.minRent !== undefined) {
      qb.andWhere('CAST(agreement.monthlyRent AS float) >= :minRent', {
        minRent: filters.minRent,
      });
    }

    if (filters.maxRent !== undefined) {
      qb.andWhere('CAST(agreement.monthlyRent AS float) <= :maxRent', {
        maxRent: filters.maxRent,
      });
    }

    if (filters.dateFrom) {
      qb.andWhere('agreement.startDate >= :dateFrom', {
        dateFrom: new Date(filters.dateFrom),
      });
    }

    if (filters.dateTo) {
      qb.andWhere('agreement.startDate <= :dateTo', {
        dateTo: new Date(filters.dateTo),
      });
    }

    return qb;
  }
}
