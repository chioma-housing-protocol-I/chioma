import { SelectQueryBuilder } from 'typeorm';

export class QueryBuilderUtils {
  /**
   * Applies basic equality filters to a query
   */
  static applyFilters(
    query: SelectQueryBuilder<any>,
    filters: Record<string, any>,
  ): SelectQueryBuilder<any> {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        // Handle array values with IN, others with equality
        if (Array.isArray(value)) {
          query.andWhere(`${query.alias}.${key} IN (:...${key})`, {
            [key]: value,
          });
        } else {
          query.andWhere(`${query.alias}.${key} = :${key}`, { [key]: value });
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
    const field =
      validFields.length === 0 || validFields.includes(sortBy)
        ? sortBy
        : 'createdAt';
    query.orderBy(`${query.alias}.${field}`, sortOrder);
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
    const skip = (page - 1) * limit;
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
