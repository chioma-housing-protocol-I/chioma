import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import { PaginatedResponseDto } from '../dto/paginated-response.dto';

/**
 * Documents a list endpoint's response as `PaginatedResponseDto<TModel>` in
 * the generated OpenAPI spec (#1614) — i.e.
 * `{ data: TModel[], total, page, limit, totalPages }`.
 *
 * Usage:
 * ```ts
 * @Get()
 * @ApiPaginatedResponse(PropertyResponseDto)
 * findAll(@Query() query: PaginationQueryDto) { ... }
 * ```
 */
export const ApiPaginatedResponse = <TModel extends Type<unknown>>(
  model: TModel,
) =>
  applyDecorators(
    ApiExtraModels(PaginatedResponseDto, model),
    ApiOkResponse({
      description: 'Paginated list',
      schema: {
        allOf: [
          { $ref: getSchemaPath(PaginatedResponseDto) },
          {
            properties: {
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(model) },
              },
            },
          },
        ],
      },
    }),
  );
