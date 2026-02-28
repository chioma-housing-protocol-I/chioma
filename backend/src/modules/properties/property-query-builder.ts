import { SelectQueryBuilder } from 'typeorm';
import { Property } from './entities/property.entity';
import { QueryPropertyDto } from './dto/query-property.dto';

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
      .applyAmenitiesFilter(filters.amenities);

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

    const actualSortBy = validSortFields.includes(sortBy)
      ? sortBy
      : 'createdAt';

    this.queryBuilder.orderBy(`property.${actualSortBy}`, sortOrder);
    return this;
  }

  /**
   * Apply pagination
   */
  applyPagination(page: number = 1, limit: number = 10): this {
    const skip = (page - 1) * limit;
    this.queryBuilder.skip(skip).take(limit);
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
