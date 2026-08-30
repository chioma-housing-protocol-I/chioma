import { ApiProperty } from '@nestjs/swagger';

/**
 * Shared response envelope for every paginated list endpoint (#1614).
 *
 * Build with `PaginatedResponseDto.create(data, total, page, limit)`, or via
 * `PaginationUtils.buildPaginationResponse`, which returns the same shape.
 * Document the concrete item type on a controller method with
 * `@ApiPaginatedResponse(ItemDto)` (see
 * `common/decorators/api-paginated-response.decorator.ts`).
 */
export class PaginatedResponseDto<T> {
  @ApiProperty({ description: 'Items on this page', isArray: true })
  data: T[];

  @ApiProperty({ description: 'Total number of items across all pages' })
  total: number;

  @ApiProperty({ description: 'Current page number (1-indexed)' })
  page: number;

  @ApiProperty({ description: 'Items requested per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;

  constructor(data: T[], total: number, page: number, limit: number) {
    this.data = data;
    this.total = total;
    this.page = page;
    this.limit = limit;
    this.totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  }

  static create<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedResponseDto<T> {
    return new PaginatedResponseDto(data, total, page, limit);
  }
}
