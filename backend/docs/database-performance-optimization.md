# Database Performance Optimization

## Property search composite indexes (Issue #1598)

### Problem

`modules/properties/` drives filtered search through
`PropertyQueryBuilder.applyFilters` (28 files, `property-query-builder.ts`),
which conjoins predicates with `andWhere`. `PropertiesService.findAll`
(`properties.service.ts`) treats any request with `status = 'published'`
and no `ownerId` as a **public listing** — the cache-warmed hot path (see
`property-cache-warming.service.ts` and the `isPublicListing` branch). On
top of that status filter, the dominant combined predicates are:

1. **Location + price range** — `status = 'published' AND city = X AND
   price BETWEEN a AND b` (the default public search: "listings in this
   city within this budget").
2. **Property type + price range** — `status = 'published' AND type = X
   AND price BETWEEN a AND b` (browsing by apartment/house/commercial/land
   within a budget).
3. **Bedroom count + price range** — `status = 'published' AND bedrooms =
   N AND price BETWEEN a AND b` (the common "N-bedroom apartments under
   $X" pattern).

Before this change, `properties` had exactly one index (`owner_id`) plus
the full-text (`search_vector` GIN) and geolocation (`lat, lng`) indexes
added in `1783000000000-AddPropertySearchIndexes.ts`. None of those cover
the three shapes above, so every filtered public search fell back to a
sequential scan over the whole table — a scan whose cost grows linearly
with listing count.

### Methodology

Profiled with a synthetic 250,000-row `properties` table (realistic
distribution: 30 cities, 5 property types, 6 status values weighted so
~60% are `published`, prices spread $300–$8000, bedrooms 1–6) on local
PostgreSQL 15, using `EXPLAIN (ANALYZE, BUFFERS)` before and after adding
the composite indexes below.

The city predicate is compared as `LOWER(property.city) = LOWER(:city)`
(see `applyLocationFilters`), so its index is built on that same
expression — a plain btree index on the raw `city` column is not usable by
a query filtering on `LOWER(city) = ...`, which is exactly why shape 1's
index indexes `LOWER("city")` rather than `"city"`.

### Migration

`1930000000000-AddPropertySearchCompositeIndexes.ts` adds:

```sql
CREATE INDEX "IDX_properties_status_city_price"     ON properties (status, LOWER(city), price);
CREATE INDEX "IDX_properties_status_type_price"      ON properties (status, type, price);
CREATE INDEX "IDX_properties_status_bedrooms_price"  ON properties (status, bedrooms, price);
```

Column order matches predicate selectivity for a btree: `status` (an
equality filter present on effectively every public search) leads, then
the second most selective equality filter (city / type / bedrooms), then
`price` last since it's a range predicate — btree indexes can still use a
trailing range column efficiently once the leading equality columns have
narrowed the scan, but a range column earlier in the index would prevent
the columns after it from being used at all.

### EXPLAIN evidence

**Query shape 1 — `status = 'published' AND LOWER(city) = 'lagos' AND
price BETWEEN 500 AND 3000 ORDER BY created_at DESC LIMIT 10`:**

| | Before | After |
|---|---|---|
| Plan | `Parallel Seq Scan` (124,326 rows filtered out) | `Bitmap Index Scan` on `IDX_properties_status_city_price` |
| Buffers | 2801 shared hits | 1074 hits + 9 reads |
| Execution time | 29.6 ms | 4.8 ms |

```
-- BEFORE
->  Parallel Seq Scan on properties  (actual time=0.034..25.234 rows=674 loops=2)
      Filter: ((price >= 500) AND (price <= 3000) AND (status = 'published')
                AND (lower(city) = 'lagos'))
      Rows Removed by Filter: 124326

-- AFTER
->  Bitmap Index Scan on "IDX_properties_status_city_price"
      (actual time=0.968..0.968 rows=1348 loops=1)
      Index Cond: ((status = 'published') AND (lower(city) = 'lagos')
                   AND (price >= 500) AND (price <= 3000))
```

**Query shape 2 — `status = 'published' AND type = 'apartment' AND price
BETWEEN 500 AND 3000 ORDER BY created_at DESC LIMIT 10`:**

| | Before | After |
|---|---|---|
| Plan | `Parallel Seq Scan` (120,921 rows filtered out) | `Bitmap Index Scan` on `IDX_properties_status_type_price` |
| Buffers | 2801 shared hits | 2655 hits + 52 reads |
| Execution time | 15.7 ms | 7.3 ms |

**Query shape 3 — `status = 'published' AND bedrooms = 2 AND price
BETWEEN 500 AND 3000 ORDER BY created_at DESC LIMIT 10`:**

| | Before | After |
|---|---|---|
| Plan | `Parallel Seq Scan` (121,662 rows filtered out) | `Bitmap Index Scan` on `IDX_properties_status_bedrooms_price` |
| Buffers | 2801 shared hits | 2537 hits + 36 reads |
| Execution time | 15.9 ms | 4.9 ms |

All three shapes moved from a full parallel sequential scan to an index
scan against the new composite index, confirmed by `EXPLAIN`'s `Index
Cond:` line matching the query's filter exactly. Shape 1 sees the largest
win in this synthetic dataset because `city` (30 distinct values) is far
more selective than `type` (5 distinct values) or `bedrooms` (6 distinct
values) — in production, with real listing-density skew per city, the
relative gains may differ, but all three queries now execute as a
selective index scan instead of scanning and filtering the entire table,
which is the property that matters as listing count grows: sequential
scan cost is `O(table size)` regardless of how selective the filter is,
while the indexed cost tracks the *matching row count*.

### Reproducing this analysis

The exact setup script and full `EXPLAIN (ANALYZE, BUFFERS)` output for
both the before and after runs are preserved for reference; to reproduce
against a fresh database:

```sql
-- 1. Load a synthetic dataset at realistic scale (adjust city/type/bedroom
--    distributions to match production if profiling for real).
-- 2. Run EXPLAIN (ANALYZE, BUFFERS) for each of the three query shapes above.
-- 3. Apply the migration in this PR.
-- 4. ANALYZE properties;
-- 5. Re-run the same three EXPLAIN queries and confirm the plan changes
--    from Seq Scan / Parallel Seq Scan to Bitmap Index Scan / Index Scan
--    referencing the new index name in `Index Cond:`.
```

### Follow-ups considered and deferred

- A covering index (`INCLUDE`) for the columns returned by the public
  listing query was considered, but `findAll` selects `property.*` plus
  joined `images`/`amenities`/`owner` relations, so a covering index would
  need to include most of the table's columns to avoid a heap lookup —
  not worthwhile here. The current indexes still avoid the heap-scan cost
  of a full table scan even though they require one heap fetch per
  matching row (visible as `Heap Blocks: exact=N` in the `Bitmap Heap
  Scan` step above).
- Partial indexes (`WHERE status = 'published'`) were considered to make
  the indexes smaller, mirroring the geolocation index's `WHERE latitude
  IS NOT NULL` pattern in `1783000000000-AddPropertySearchIndexes.ts`.
  This was deliberately not done: `status` is the leading column and
  already prunes non-published rows efficiently via the composite key
  itself, and keeping `status` as a real leading column (rather than a
  `WHERE` clause) means the same index also serves owner-scoped
  non-public queries (draft/archived listings) that filter on other
  status values, which a `WHERE status = 'published'` partial index could
  not.
