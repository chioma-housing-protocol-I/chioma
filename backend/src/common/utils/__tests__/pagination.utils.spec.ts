import { PaginationUtils } from '../pagination.utils';
import { BadRequestException } from '@nestjs/common';

describe('PaginationUtils', () => {
  describe('calculateOffset', () => {
    it('should calculate correct offset', () => {
      expect(PaginationUtils.calculateOffset(1, 10)).toBe(0);
      expect(PaginationUtils.calculateOffset(2, 10)).toBe(10);
      expect(PaginationUtils.calculateOffset(3, 20)).toBe(40);
    });
  });

  describe('validatePagination', () => {
    it('should not throw for valid parameters', () => {
      expect(() => PaginationUtils.validatePagination(1, 10)).not.toThrow();
      expect(() => PaginationUtils.validatePagination(10, 100)).not.toThrow();
    });

    it('should throw BadRequestException for invalid parameters', () => {
      expect(() => PaginationUtils.validatePagination(0, 10)).toThrow(
        BadRequestException,
      );
      expect(() => PaginationUtils.validatePagination(1, 0)).toThrow(
        BadRequestException,
      );
      expect(() => PaginationUtils.validatePagination(1, 101)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('buildPaginationResponse', () => {
    it('should return standardized response', () => {
      const data = ['item1', 'item2'];
      const total = 25;
      const page = 1;
      const limit = 10;

      const response = PaginationUtils.buildPaginationResponse(
        data,
        total,
        page,
        limit,
      );

      expect(response).toEqual({
        data,
        total,
        page,
        limit,
        totalPages: 3,
      });
    });
  });
});
