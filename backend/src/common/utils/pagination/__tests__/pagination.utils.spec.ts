import { PaginationUtils } from '../pagination.utils';
import { BadRequestException } from '@nestjs/common';

describe('PaginationUtils', () => {
  describe('calculateOffset', () => {
    it('should return 0 for page 1', () => {
      expect(PaginationUtils.calculateOffset(1, 10)).toBe(0);
      expect(PaginationUtils.calculateOffset(1, 50)).toBe(0);
    });

    it('should calculate correct offset for subsequent pages', () => {
      expect(PaginationUtils.calculateOffset(2, 10)).toBe(10);
      expect(PaginationUtils.calculateOffset(3, 10)).toBe(20);
      expect(PaginationUtils.calculateOffset(3, 20)).toBe(40);
    });

    it('should handle large page numbers', () => {
      expect(PaginationUtils.calculateOffset(100, 10)).toBe(990);
      expect(PaginationUtils.calculateOffset(1000, 100)).toBe(99900);
    });

    it('should handle limit of 1', () => {
      expect(PaginationUtils.calculateOffset(5, 1)).toBe(4);
    });
  });

  describe('validatePagination', () => {
    it('should not throw for valid parameters', () => {
      expect(() => PaginationUtils.validatePagination(1, 1)).not.toThrow();
      expect(() => PaginationUtils.validatePagination(1, 10)).not.toThrow();
      expect(() => PaginationUtils.validatePagination(10, 100)).not.toThrow();
      expect(() => PaginationUtils.validatePagination(999, 50)).not.toThrow();
    });

    it('should throw BadRequestException when page < 1', () => {
      expect(() => PaginationUtils.validatePagination(0, 10)).toThrow(
        BadRequestException,
      );
      expect(() => PaginationUtils.validatePagination(-1, 10)).toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when limit < 1', () => {
      expect(() => PaginationUtils.validatePagination(1, 0)).toThrow(
        BadRequestException,
      );
      expect(() => PaginationUtils.validatePagination(1, -5)).toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when limit > 100', () => {
      expect(() => PaginationUtils.validatePagination(1, 101)).toThrow(
        BadRequestException,
      );
      expect(() => PaginationUtils.validatePagination(1, 1000)).toThrow(
        BadRequestException,
      );
    });

    it('should include descriptive error messages', () => {
      expect(() => PaginationUtils.validatePagination(0, 10)).toThrow(
        'Page number must be at least 1',
      );
      expect(() => PaginationUtils.validatePagination(1, 0)).toThrow(
        'Limit must be at least 1',
      );
      expect(() => PaginationUtils.validatePagination(1, 101)).toThrow(
        'Limit cannot exceed 100',
      );
    });
  });

  describe('buildPaginationResponse', () => {
    it('should build correct response for first page', () => {
      const data = ['a', 'b', 'c'];
      const result = PaginationUtils.buildPaginationResponse(data, 25, 1, 10);

      expect(result).toEqual({
        data,
        total: 25,
        page: 1,
        limit: 10,
        totalPages: 3,
      });
    });

    it('should calculate totalPages correctly', () => {
      expect(
        PaginationUtils.buildPaginationResponse([], 100, 1, 10).totalPages,
      ).toBe(10);
      expect(
        PaginationUtils.buildPaginationResponse([], 101, 1, 10).totalPages,
      ).toBe(11);
      expect(
        PaginationUtils.buildPaginationResponse([], 10, 1, 10).totalPages,
      ).toBe(1);
      expect(
        PaginationUtils.buildPaginationResponse([], 1, 1, 10).totalPages,
      ).toBe(1);
    });

    it('should handle empty results (zero total)', () => {
      const result = PaginationUtils.buildPaginationResponse([], 0, 1, 10);

      expect(result).toEqual({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });
    });

    it('should handle single page result (total <= limit)', () => {
      const data = [1, 2, 3];
      const result = PaginationUtils.buildPaginationResponse(data, 3, 1, 10);

      expect(result.totalPages).toBe(1);
      expect(result.data).toHaveLength(3);
    });

    it('should preserve page and limit in response', () => {
      const result = PaginationUtils.buildPaginationResponse([], 50, 3, 20);

      expect(result.page).toBe(3);
      expect(result.limit).toBe(20);
    });

    it('should handle large datasets', () => {
      const data = Array.from({ length: 100 }, (_, i) => i);
      const result = PaginationUtils.buildPaginationResponse(
        data,
        10000,
        50,
        100,
      );

      expect(result.totalPages).toBe(100);
      expect(result.data).toHaveLength(100);
    });

    it('should handle non-integer total pages by rounding up', () => {
      // 11 items / 10 per page = 1.1 → ceil = 2
      const result = PaginationUtils.buildPaginationResponse([], 11, 1, 10);
      expect(result.totalPages).toBe(2);
    });
  });

  describe('offset-based pagination flow', () => {
    it('should produce consistent offsets across pages', () => {
      const limit = 10;
      const pages = [1, 2, 3, 4, 5];
      const offsets = pages.map((p) =>
        PaginationUtils.calculateOffset(p, limit),
      );

      expect(offsets).toEqual([0, 10, 20, 30, 40]);
    });

    it('should not overlap pages', () => {
      const limit = 5;
      const page1Start = PaginationUtils.calculateOffset(1, limit);
      const page2Start = PaginationUtils.calculateOffset(2, limit);

      expect(page2Start).toBe(page1Start + limit);
    });
  });
});
