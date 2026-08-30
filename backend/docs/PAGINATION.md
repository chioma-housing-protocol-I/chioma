# Pagination

This document describes the shared pagination contract used across every
list endpoint in the Chioma API (#1614).

## Why a shared contract

Before this contract, list endpoints differed in whether they paginated at
all and, where they did, in what shape they returned it in (`items` vs
`data`, nested `meta` vs flat fields, `offset` vs `page`, with or without
`totalPages`). Clients had to special-case each endpoint, and endpoints with
no pagination at all were latent performance problems — an unbounded list
query only gets slower as the table grows.

## The contract

### Request: `PaginationQueryDto`

**Location:** `backend/src/common/dto/pagination-query.dto.ts`

```typescript
export class PaginationQueryDto {
  page?: number = 1; // 1-indexed
  limit?: number = DEFAULT_PAGE_SIZE; // 20, see business-rules.constants.ts
}
```

Every list endpoint accepts `page` and `limit` as query parameters:

```
GET /properties?page=2&limit=25
```

- `page` and `limit` are optional; omitting them returns page 1 at the
  default page size.
- `limit` is capped at `MAX_PAGE_SIZE` (100 by default, see
  `backend/src/common/constants/business-rules.constants.ts`). A request for
  a larger page size is rejected with `400 Bad Request` by the global
  `ValidationPipe` — this is what makes the "unbounded query" performance
  problem structurally impossible for endpoints on the shared contract.
- Both fields are validated and coerced to numbers automatically (the global
  `ValidationPipe` runs with `transform: true`), so a controller can pass
  `query.page` / `query.limit` straight through to a service without manual
  parsing.
- To add endpoint-specific filters, extend the DTO rather than duplicating
  the pagination fields:

```typescript
export class FindPropertiesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  city?: string;
}
```

### Response: `PaginatedResponseDto<T>`

**Location:** `backend/src/common/dto/paginated-response.dto.ts`

```json
{
  "data": [ ... ],
  "total": 137,
  "page": 2,
  "limit": 25,
  "totalPages": 6
}
```

| Field        | Description                                   |
| ------------ | --------------------------------------------- |
| `data`       | The items on this page                        |
| `total`      | Total number of items across all pages        |
| `page`       | The page number that was returned (1-indexed) |
| `limit`      | The page size that was applied                |
| `totalPages` | `ceil(total / limit)`                         |

This is the **only** shape a list endpoint should return — no `items`, no
nested `meta`, no bare arrays, no `offset`-only responses.

## Using the contract in a controller

```typescript
@Get()
@ApiPaginatedResponse(PropertyResponseDto)
findAll(
  @Query() query: PaginationQueryDto,
): Promise<PaginatedResponseDto<PropertyResponseDto>> {
  return this.propertiesService.findAll(query.page, query.limit);
}
```

`@ApiPaginatedResponse(Model)` (in
`backend/src/common/decorators/api-paginated-response.decorator.ts`)
documents the endpoint's response in the generated OpenAPI spec as
`PaginatedResponseDto<Model>` — i.e. `{ data: Model[], total, page, limit,
totalPages }` — so `data`'s item type shows up correctly for API consumers
and SDK generation (`npm run openapi:generate` / `npm run sdk:generate`),
instead of the generic envelope's untyped `data: unknown[]`.

## Using the contract in a service

`PaginationUtils` (`backend/src/common/utils/pagination/pagination.utils.ts`)
builds the envelope and validates inputs:

```typescript
async findAll(page: number, limit: number): Promise<PaginatedResponseDto<Property>> {
  PaginationUtils.validatePagination(page, limit);
  const offset = PaginationUtils.calculateOffset(page, limit);

  const [data, total] = await this.propertyRepo.findAndCount({
    skip: offset,
    take: limit,
  });

  return PaginationUtils.buildPaginationResponse(data, total, page, limit);
}
```

`PaginationUtils.validatePagination` is a second line of defense (useful for
service methods that receive raw numbers from somewhere other than
`PaginationQueryDto`, e.g. an internal caller); it throws the same
`400 Bad Request` the DTO's `class-validator` decorators would produce.

For sources that don't support `skip`/`take` at the query level — a raw SQL
query against a Postgres system catalog, an in-memory tracked collection —
use `PaginationUtils.paginateArray(items, page, limit)` instead. It applies
the same validation and slices the already-fetched array into the standard
envelope, so the endpoint's response shape is identical either way.

## Endpoints that are exempt

A handful of `GET` endpoints intentionally do **not** use this contract
because they aren't paginated collections:

- Fixed, small, ops-configured sets (RBAC roles/permissions, feature flags,
  supported languages, the ML model registry).
- Autocomplete/ranking results that are inherently capped by a single
  `limit` (search suggestions, AI property recommendations/similar-listings)
  rather than paged.
- Computed, bounded results (a payment schedule for one lease term, an
  availability calendar for a caller-supplied date range).

Everything else — including admin/ops dashboards (audit logs, security
events, database performance diagnostics, queue inspection) — uses the
shared contract, since "internal" endpoints are exactly as capable of
becoming a performance problem as public ones once the underlying table
grows.
