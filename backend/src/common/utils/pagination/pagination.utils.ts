import { BadRequestException } from '@nestjs/common';
import { MAX_PAGE_SIZE } from '../../constants/business-rules.constants';
import { PaginatedResponseDto } from '../../dto/paginated-response.dto';

/**
 * @deprecated Use `PaginatedResponseDto<T>` from `common/dto/paginated-response.dto`
 * directly for typing — `buildPaginationResponse` now returns that class.
 * Kept as a structural alias so existing call sites keep compiling unchanged.
 */
export type PaginationResponse<T> = PaginatedResponseDto<T>;

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
    if (limit > MAX_PAGE_SIZE) {
      throw new BadRequestException(`Limit cannot exceed ${MAX_PAGE_SIZE}`);
    }
  }

  /**
   * Builds the shared pagination response envelope (#1614).
   */
  static buildPaginationResponse<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedResponseDto<T> {
    return PaginatedResponseDto.create(data, total, page, limit);
  }

  /**
   * Applies the shared pagination contract to a result that was already
   * fetched in full (e.g. a raw-SQL system-catalog query, or an in-memory
   * tracked collection) rather than queried with `skip`/`take` at the
   * source. Slices `items` to the requested page and wraps it in the same
   * envelope `buildPaginationResponse` produces.
   */
  static paginateArray<T>(
    items: T[],
    page: number,
    limit: number,
  ): PaginatedResponseDto<T> {
    this.validatePagination(page, limit);
    const offset = this.calculateOffset(page, limit);
    const data = items.slice(offset, offset + limit);
    return this.buildPaginationResponse(data, items.length, page, limit);
  }
}
