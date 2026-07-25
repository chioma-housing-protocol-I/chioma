import { QueryBuilderUtils } from '../query-builder.utils';

describe('QueryBuilderUtils', () => {
  let mockQb: any;

  beforeEach(() => {
    mockQb = {
      alias: 'entity',
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
    };
  });

  describe('applyFilters', () => {
    it('should apply equality filter for a string value', () => {
      QueryBuilderUtils.applyFilters(mockQb, { status: 'ACTIVE' });

      expect(mockQb.andWhere).toHaveBeenCalledWith('entity.status = :status', {
        status: 'ACTIVE',
      });
    });

    it('should apply equality filter for a numeric value', () => {
      QueryBuilderUtils.applyFilters(mockQb, { page: 1 });

      expect(mockQb.andWhere).toHaveBeenCalledWith('entity.page = :page', {
        page: 1,
      });
    });

    it('should apply IN filter for array values', () => {
      QueryBuilderUtils.applyFilters(mockQb, {
        roles: ['ADMIN', 'LANDLORD'],
      });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'entity.roles IN (:...roles)',
        { roles: ['ADMIN', 'LANDLORD'] },
      );
    });

    it('should apply IN filter for single-element array', () => {
      QueryBuilderUtils.applyFilters(mockQb, { types: ['APARTMENT'] });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'entity.types IN (:...types)',
        { types: ['APARTMENT'] },
      );
    });

    it('should skip undefined values', () => {
      QueryBuilderUtils.applyFilters(mockQb, { status: undefined });

      expect(mockQb.andWhere).not.toHaveBeenCalled();
    });

    it('should skip null values', () => {
      QueryBuilderUtils.applyFilters(mockQb, { status: null });

      expect(mockQb.andWhere).not.toHaveBeenCalled();
    });

    it('should skip empty string values', () => {
      QueryBuilderUtils.applyFilters(mockQb, { status: '' });

      expect(mockQb.andWhere).not.toHaveBeenCalled();
    });

    it('should apply multiple filters', () => {
      QueryBuilderUtils.applyFilters(mockQb, {
        action: 'CREATE',
        status: 'SUCCESS',
        level: 'INFO',
      });

      expect(mockQb.andWhere).toHaveBeenCalledTimes(3);
    });

    it('should skip mixed valid/invalid filters correctly', () => {
      QueryBuilderUtils.applyFilters(mockQb, {
        valid: 'value',
        empty: '',
        undef: undefined,
        nul: null,
      });

      expect(mockQb.andWhere).toHaveBeenCalledTimes(1);
      expect(mockQb.andWhere).toHaveBeenCalledWith('entity.valid = :valid', {
        valid: 'value',
      });
    });

    it('should return the query builder for chaining', () => {
      const result = QueryBuilderUtils.applyFilters(mockQb, {});
      expect(result).toBe(mockQb);
    });

    it('applies filter for boolean false (falsy but not undefined/null/empty)', () => {
      QueryBuilderUtils.applyFilters(mockQb, { isActive: false });

      // The implementation checks `value !== undefined && value !== null && value !== ''`
      // so `false` passes through and is applied as an equality filter
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'entity.isActive = :isActive',
        {
          isActive: false,
        },
      );
    });
  });

  describe('applySorting', () => {
    it('should apply the specified sort field and direction', () => {
      QueryBuilderUtils.applySorting(mockQb, 'createdAt', 'DESC');

      expect(mockQb.orderBy).toHaveBeenCalledWith('entity.createdAt', 'DESC');
    });

    it('should apply ASC sort order', () => {
      QueryBuilderUtils.applySorting(mockQb, 'price', 'ASC');

      expect(mockQb.orderBy).toHaveBeenCalledWith('entity.price', 'ASC');
    });

    it('should fallback to createdAt when field is not in validFields', () => {
      QueryBuilderUtils.applySorting(mockQb, 'injectedField', 'DESC', [
        'price',
        'title',
      ]);

      expect(mockQb.orderBy).toHaveBeenCalledWith('entity.createdAt', 'DESC');
    });

    it('should allow any field when validFields is empty', () => {
      QueryBuilderUtils.applySorting(mockQb, 'anyField', 'ASC', []);

      expect(mockQb.orderBy).toHaveBeenCalledWith('entity.anyField', 'ASC');
    });

    it('should allow any field when validFields is not provided', () => {
      QueryBuilderUtils.applySorting(mockQb, 'customField', 'DESC');

      expect(mockQb.orderBy).toHaveBeenCalledWith('entity.customField', 'DESC');
    });

    it('should use createdAt as default sort field', () => {
      QueryBuilderUtils.applySorting(mockQb, undefined, 'DESC');

      expect(mockQb.orderBy).toHaveBeenCalledWith('entity.createdAt', 'DESC');
    });

    it('should use DESC as default sort order', () => {
      QueryBuilderUtils.applySorting(mockQb, 'createdAt', undefined);

      expect(mockQb.orderBy).toHaveBeenCalledWith('entity.createdAt', 'DESC');
    });

    it('should accept a valid field from validFields list', () => {
      QueryBuilderUtils.applySorting(mockQb, 'price', 'ASC', [
        'price',
        'createdAt',
        'title',
      ]);

      expect(mockQb.orderBy).toHaveBeenCalledWith('entity.price', 'ASC');
    });

    it('should return the query builder for chaining', () => {
      const result = QueryBuilderUtils.applySorting(
        mockQb,
        'createdAt',
        'DESC',
      );
      expect(result).toBe(mockQb);
    });
  });

  describe('applyPagination', () => {
    it('should set skip=0 and take=limit for page 1', () => {
      QueryBuilderUtils.applyPagination(mockQb, 1, 10);

      expect(mockQb.skip).toHaveBeenCalledWith(0);
      expect(mockQb.take).toHaveBeenCalledWith(10);
    });

    it('should calculate correct skip for page 2', () => {
      QueryBuilderUtils.applyPagination(mockQb, 2, 10);

      expect(mockQb.skip).toHaveBeenCalledWith(10);
      expect(mockQb.take).toHaveBeenCalledWith(10);
    });

    it('should calculate correct skip for page 3 with limit 25', () => {
      QueryBuilderUtils.applyPagination(mockQb, 3, 25);

      expect(mockQb.skip).toHaveBeenCalledWith(50);
      expect(mockQb.take).toHaveBeenCalledWith(25);
    });

    it('should use defaults when no args provided', () => {
      QueryBuilderUtils.applyPagination(mockQb);

      expect(mockQb.skip).toHaveBeenCalledWith(0);
      expect(mockQb.take).toHaveBeenCalledWith(10);
    });

    it('should handle large page numbers', () => {
      QueryBuilderUtils.applyPagination(mockQb, 100, 50);

      expect(mockQb.skip).toHaveBeenCalledWith(4950);
      expect(mockQb.take).toHaveBeenCalledWith(50);
    });

    it('should return the query builder for chaining', () => {
      const result = QueryBuilderUtils.applyPagination(mockQb, 1, 10);
      expect(result).toBe(mockQb);
    });
  });

  describe('chaining', () => {
    it('should support method chaining across all utils', () => {
      QueryBuilderUtils.applyFilters(mockQb, { status: 'ACTIVE' });
      QueryBuilderUtils.applySorting(mockQb, 'createdAt', 'DESC');
      QueryBuilderUtils.applyPagination(mockQb, 1, 10);

      expect(mockQb.andWhere).toHaveBeenCalledTimes(1);
      expect(mockQb.orderBy).toHaveBeenCalledTimes(1);
      expect(mockQb.skip).toHaveBeenCalledTimes(1);
      expect(mockQb.take).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('should handle empty filters object', () => {
      QueryBuilderUtils.applyFilters(mockQb, {});
      expect(mockQb.andWhere).not.toHaveBeenCalled();
    });

    it('should handle empty array filter value', () => {
      QueryBuilderUtils.applyFilters(mockQb, { ids: [] });
      // Empty array is truthy, so it will be applied as IN
      expect(mockQb.andWhere).toHaveBeenCalledWith('entity.ids IN (:...ids)', {
        ids: [],
      });
    });

    it('should use alias from query builder for field prefixing', () => {
      mockQb.alias = 'audit_log';
      QueryBuilderUtils.applyFilters(mockQb, { action: 'CREATE' });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'audit_log.action = :action',
        { action: 'CREATE' },
      );
    });

    it('should use alias from query builder for sorting', () => {
      mockQb.alias = 'property';
      QueryBuilderUtils.applySorting(mockQb, 'price', 'ASC');

      expect(mockQb.orderBy).toHaveBeenCalledWith('property.price', 'ASC');
    });
  });
});
