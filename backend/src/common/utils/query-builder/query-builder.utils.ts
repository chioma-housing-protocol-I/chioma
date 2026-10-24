import { SelectQueryBuilder } from 'typeorm';
import { PaginationUtils } from '../pagination/pagination.utils';

/**
 * PostgreSQL rejects an `OFFSET`/`LIMIT` value outside the 32-bit signed
 * integer range with a driver error rather than an empty result set. A
 * page number far beyond the dataset's actual size (whether from a client
 * paging past the end of a result set or a malicious huge `page` value)
 * can produce an offset past that range; this caps it so such requests
 * degrade to an empty page instead of a 500.
 */
const MAX_SAFE_OFFSET = 2147483647;

export class QueryBuilderUtils {
  private static readonly SAFE_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

  /**
   * Applies basic equality filters to a query
   */
  static applyFilters(
    query: SelectQueryBuilder<any>,
    filters: Record<string, any>,
  ): SelectQueryBuilder<any> {
    Object.entries(filters).forEach(([key, value], index) => {
      if (value !== undefined && value !== null && value !== '') {
        if (!this.SAFE_IDENTIFIER.test(key)) {
          return;
        }

        const parameterName = `filter_${index}`;

        // Handle array values with IN, others with equality
        if (Array.isArray(value)) {
          query.andWhere(`${query.alias}.${key} IN (:...${parameterName})`, {
            [parameterName]: value,
          });
        } else {
          query.andWhere(`${query.alias}.${key} = :${parameterName}`, {
            [parameterName]: value,
          });
        }
      }
    });
    return query;
  }

  /**
   * Applies sorting to a query
   */
  static applySorting(
    query: SelectQueryBuilder<any>,
    sortBy: string = 'createdAt',
    sortOrder: 'ASC' | 'DESC' = 'DESC',
    validFields: string[] = [],
  ): SelectQueryBuilder<any> {
    const safeSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';
    const field =
      validFields.length > 0
        ? validFields.includes(sortBy)
          ? sortBy
          : 'createdAt'
        : this.SAFE_IDENTIFIER.test(sortBy)
          ? sortBy
          : 'createdAt';
    query.orderBy(`${query.alias}.${field}`, safeSortOrder);
    return query;
  }

  /**
   * Applies pagination to a query
   */
  static applyPagination(
    query: SelectQueryBuilder<any>,
    page: number = 1,
    limit: number = 10,
  ): SelectQueryBuilder<any> {
    PaginationUtils.validatePagination(page, limit);
    const skip = Math.min(
      PaginationUtils.calculateOffset(page, limit),
      MAX_SAFE_OFFSET,
    );
    query.skip(skip).take(limit);
    return query;
  }

  /**
   * Builds a complex query with multiple criteria (placeholder for extensibility)
   */
  static buildComplexQuery(
    query: SelectQueryBuilder<any>,
    _criteria: any,
  ): SelectQueryBuilder<any> {
    // This can be expanded based on specific needs like full-text search, etc.
    return query;
  }
}
