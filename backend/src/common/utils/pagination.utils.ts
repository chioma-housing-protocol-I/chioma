import { BadRequestException } from '@nestjs/common';

export interface PaginationResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class PaginationUtils {
  /**
   * Calculates the database offset (skip) for pagination
   */
  static calculateOffset(page: number, limit: number): number {
    return (page - 1) * limit;
  }

  /**
   * Validates pagination parameters
   */
  static validatePagination(page: number, limit: number): void {
    if (page < 1) {
      throw new BadRequestException('Page number must be at least 1');
    }
    if (limit < 1) {
      throw new BadRequestException('Limit must be at least 1');
    }
    if (limit > 100) {
      throw new BadRequestException('Limit cannot exceed 100');
    }
  }

  /**
   * Builds a standardized pagination response
   */
  static buildPaginationResponse<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
  ): PaginationResponse<T> {
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
