import { QueryBuilderUtils } from '../query-builder.utils';

describe('QueryBuilderUtils', () => {
  let mockQb: any;

  beforeEach(() => {
    mockQb = {
      alias: 'audit_log',
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
    };
  });

  describe('applyFilters', () => {
    it('should handle simple equality filters', () => {
      QueryBuilderUtils.applyFilters(mockQb, {
        action: 'CREATE',
        status: 'SUCCESS',
      });
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'audit_log.action = :action',
        { action: 'CREATE' },
      );
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'audit_log.status = :status',
        { status: 'SUCCESS' },
      );
    });

    it('should handle array filters with IN', () => {
      QueryBuilderUtils.applyFilters(mockQb, { levels: ['INFO', 'WARN'] });
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'audit_log.levels IN (:...levels)',
        { levels: ['INFO', 'WARN'] },
      );
    });

    it('should skip empty or undefined filters', () => {
      QueryBuilderUtils.applyFilters(mockQb, {
        empty: '',
        undef: undefined,
        nul: null,
      });
      expect(mockQb.andWhere).not.toHaveBeenCalled();
    });
  });

  describe('applySorting', () => {
    it('should apply order by correctly', () => {
      QueryBuilderUtils.applySorting(mockQb, 'performedAt', 'DESC');
      expect(mockQb.orderBy).toHaveBeenCalledWith(
        'audit_log.performedAt',
        'DESC',
      );
    });

    it('should fallback to default if field is invalid', () => {
      QueryBuilderUtils.applySorting(mockQb, 'invalid', 'ASC', ['valid']);
      expect(mockQb.orderBy).toHaveBeenCalledWith('audit_log.createdAt', 'ASC');
    });
  });

  describe('applyPagination', () => {
    it('should set skip and take based on page and limit', () => {
      QueryBuilderUtils.applyPagination(mockQb, 2, 25);
      expect(mockQb.skip).toHaveBeenCalledWith(25);
      expect(mockQb.take).toHaveBeenCalledWith(25);
    });
  });
});
