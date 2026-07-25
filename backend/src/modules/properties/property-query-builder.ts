import { SelectQueryBuilder } from 'typeorm';
import { Property } from './entities/property.entity';
import { QueryPropertyDto } from './dto/query-property.dto';
import { QueryBuilderUtils } from '../../common/utils';

/**
 * PropertyQueryBuilder - Fluent interface for building property queries
 * Follows Single Responsibility Principle by separating query building logic
 */
export class PropertyQueryBuilder {
  private queryBuilder: SelectQueryBuilder<Property>;

  constructor(queryBuilder: SelectQueryBuilder<Property>) {
    this.queryBuilder = queryBuilder;
  }

  /**
   * Apply all filters from QueryPropertyDto
   */
  applyFilters(filters: QueryPropertyDto): this {
    this.applyTypeFilter(filters.type)
      .applyStatusFilter(filters.status)
      .applyPriceFilters(filters.minPrice, filters.maxPrice)
      .applyBedroomFilters(filters.minBedrooms, filters.maxBedrooms)
      .applyBathroomFilters(filters.minBathrooms, filters.maxBathrooms)
      .applyLocationFilters(filters.city, filters.state, filters.country)
      .applyOwnerFilter(filters.ownerId)
      .applySearchFilter(filters.search)
      .applyAmenitiesFilter(filters.amenities)
      .applyBooleanFilters(
        filters.isFurnished,
        filters.hasParking,
        filters.petsAllowed,
      )
      .applyProximityFilter(filters.lat, filters.lng, filters.radiusKm);

    return this;
  }

  /**
   * Filter by property type
   */
  applyTypeFilter(type?: string): this {
    if (type) {
      this.queryBuilder.andWhere('property.type = :type', { type });
    }
    return this;
  }

  /**
   * Filter by listing status
   */
  applyStatusFilter(status?: string): this {
    if (status) {
      this.queryBuilder.andWhere('property.status = :status', { status });
    }
    return this;
  }

  /**
   * Filter by price range
   */
  applyPriceFilters(minPrice?: number, maxPrice?: number): this {
    if (minPrice !== undefined) {
      this.queryBuilder.andWhere('property.price >= :minPrice', { minPrice });
    }
    if (maxPrice !== undefined) {
      this.queryBuilder.andWhere('property.price <= :maxPrice', { maxPrice });
    }
    return this;
  }

  /**
   * Filter by bedroom count range
   */
  applyBedroomFilters(minBedrooms?: number, maxBedrooms?: number): this {
    if (minBedrooms !== undefined) {
      this.queryBuilder.andWhere('property.bedrooms >= :minBedrooms', {
        minBedrooms,
      });
    }
    if (maxBedrooms !== undefined) {
      this.queryBuilder.andWhere('property.bedrooms <= :maxBedrooms', {
        maxBedrooms,
      });
    }
    return this;
  }

  /**
   * Filter by bathroom count range
   */
  applyBathroomFilters(minBathrooms?: number, maxBathrooms?: number): this {
    if (minBathrooms !== undefined) {
      this.queryBuilder.andWhere('property.bathrooms >= :minBathrooms', {
        minBathrooms,
      });
    }
    if (maxBathrooms !== undefined) {
      this.queryBuilder.andWhere('property.bathrooms <= :maxBathrooms', {
        maxBathrooms,
      });
    }
    return this;
  }

  /**
   * Filter by location (city, state, country)
   */
  applyLocationFilters(city?: string, state?: string, country?: string): this {
    if (city) {
      this.queryBuilder.andWhere('LOWER(property.city) = LOWER(:city)', {
        city,
      });
    }
    if (state) {
      this.queryBuilder.andWhere('LOWER(property.state) = LOWER(:state)', {
        state,
      });
    }
    if (country) {
      this.queryBuilder.andWhere('LOWER(property.country) = LOWER(:country)', {
        country,
      });
    }
    return this;
  }

  /**
   * Filter by owner ID
   */
  applyOwnerFilter(ownerId?: string): this {
    if (ownerId) {
      this.queryBuilder.andWhere('property.ownerId = :ownerId', { ownerId });
    }
    return this;
  }

  /**
   * Apply full-text search on title and description
   */
  applySearchFilter(search?: string): this {
    if (search) {
      this.queryBuilder.andWhere(
        '(LOWER(property.title) LIKE LOWER(:search) OR ' +
          'LOWER(property.description) LIKE LOWER(:search))',
        { search: `%${search}%` },
      );
    }
    return this;
  }

  /**
   * Filter by amenities
   */
  applyAmenitiesFilter(amenities?: string[]): this {
    if (amenities && amenities.length > 0) {
      this.queryBuilder.andWhere(
        'EXISTS (SELECT 1 FROM property_amenities pa ' +
          'WHERE pa.property_id = property.id AND ' +
          'LOWER(pa.name) IN (:...amenities))',
        { amenities: amenities.map((a) => a.toLowerCase()) },
      );
    }
    return this;
  }

  /**
   * Filter by boolean property attributes (furnished, parking, pets)
   */
  applyBooleanFilters(
    isFurnished?: boolean,
    hasParking?: boolean,
    petsAllowed?: boolean,
  ): this {
    if (isFurnished !== undefined) {
      this.queryBuilder.andWhere('property.isFurnished = :isFurnished', {
        isFurnished,
      });
    }
    if (hasParking !== undefined) {
      this.queryBuilder.andWhere('property.hasParking = :hasParking', {
        hasParking,
      });
    }
    if (petsAllowed !== undefined) {
      this.queryBuilder.andWhere('property.petsAllowed = :petsAllowed', {
        petsAllowed,
      });
    }
    return this;
  }

  /**
   * Filter by proximity using the Haversine formula.
   * Requires lat, lng, and radiusKm to all be defined.
   */
  applyProximityFilter(lat?: number, lng?: number, radiusKm?: number): this {
    if (lat !== undefined && lng !== undefined && radiusKm !== undefined) {
      this.queryBuilder.andWhere(
        `(
          6371 * acos(
            cos(radians(:lat))
            * cos(radians(CAST(property.latitude AS float)))
            * cos(radians(CAST(property.longitude AS float)) - radians(:lng))
            + sin(radians(:lat))
            * sin(radians(CAST(property.latitude AS float)))
          )
        ) <= :radiusKm`,
        { lat, lng, radiusKm },
      );
    }
    return this;
  }

  /**
   * Apply sorting
   */
  applySorting(
    sortBy: string = 'createdAt',
    sortOrder: 'ASC' | 'DESC' = 'DESC',
  ): this {
    const validSortFields = [
      'createdAt',
      'updatedAt',
      'price',
      'bedrooms',
      'bathrooms',
      'area',
      'title',
    ];

    QueryBuilderUtils.applySorting(
      this.queryBuilder,
      sortBy,
      sortOrder,
      validSortFields,
    );
    return this;
  }

  /**
   * Apply pagination
   */
  applyPagination(page: number = 1, limit: number = 10): this {
    QueryBuilderUtils.applyPagination(this.queryBuilder, page, limit);
    return this;
  }

  /**
   * Get the underlying query builder
   */
  getQueryBuilder(): SelectQueryBuilder<Property> {
    return this.queryBuilder;
  }

  /**
   * Execute query and return results with count
   */
  async execute(): Promise<[Property[], number]> {
    return this.queryBuilder.getManyAndCount();
  }
}
