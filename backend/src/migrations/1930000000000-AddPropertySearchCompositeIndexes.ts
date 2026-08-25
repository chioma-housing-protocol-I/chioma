import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Add composite indexes matching the property search module's
 * dominant filtered-search query shapes, for issue #1598.
 *
 * `PropertyQueryBuilder.applyFilters` (properties/property-query-builder.ts)
 * conjoins predicates with `andWhere`, and `PropertiesService.findAll`
 * defaults every public listing request to `status = 'published'`
 * (properties/properties.service.ts's `isPublicListing` branch — the
 * cache-warmed hot path). Location + price range is the dominant combined
 * predicate on top of that status filter; type and bedroom count are the
 * next most common secondary narrowing filters. See
 * `docs/database-performance-optimization.md` for the EXPLAIN analysis
 * behind this specific column ordering.
 *
 * Location filtering compares `LOWER(property.city)` (see
 * `applyLocationFilters`), so the city index is built on that same
 * expression — a plain btree index on the raw column would not be used by
 * a query filtering on `LOWER(city) = ...`.
 */
export class AddPropertySearchCompositeIndexes1930000000000 implements MigrationInterface {
  name = 'AddPropertySearchCompositeIndexes1930000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Query shape 1 (dominant): status + city (case-insensitive) + price
    // range — the default public-listing search: "published properties in
    // <city> under <price>".
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_properties_status_city_price"
      ON "properties" ("status", LOWER("city"), "price")
    `);

    // Query shape 2: status + type + price range — browsing by property
    // type (apartment/house/commercial/land) within a budget.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_properties_status_type_price"
      ON "properties" ("status", "type", "price")
    `);

    // Query shape 3: status + bedrooms + price range — the common
    // "N-bedroom apartments under $X" browse pattern.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_properties_status_bedrooms_price"
      ON "properties" ("status", "bedrooms", "price")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_properties_status_bedrooms_price"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_properties_status_type_price"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_properties_status_city_price"`,
    );
  }
}
