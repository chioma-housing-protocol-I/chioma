import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Index location + price for the property search hot path
 * (issue #2023 — target <100ms for 10k properties).
 *
 * `IDX_properties_status_city_price` (issue #1598) already covers city-based
 * search. Coordinate-based search (`lat`/`lng`/`radiusKm` in
 * `PropertyQueryBuilder.applyProximityFilter` and `SearchService`) used to
 * rely on a Haversine expression only, which no index can serve, so every
 * proximity search was a sequential scan. Those queries now emit a sargable
 * `latitude BETWEEN ... AND longitude BETWEEN ...` bounding box first (see
 * `GeoUtils.boundingBox`), and this migration adds the matching indexes:
 *
 *  1. (status, latitude, longitude, price) — "published properties within
 *     N km under $X". The equality on status comes first, the latitude range
 *     is the index seek, and longitude + price are filtered inside the index
 *     before any heap access. Partial on non-null coordinates, matching
 *     `IDX_properties_lat_lng`, so un-geocoded listings don't bloat it.
 *  2. (status, price) — price-only browsing and `sortBy=price` on public
 *     listings, which otherwise falls back to the single-column
 *     `IDX_properties_price` plus a status recheck on every row.
 *
 * Both indexes exclude soft-deleted rows, since TypeORM appends
 * `deleted_at IS NULL` to every repository query.
 */
export class AddPropertyGeoPriceSearchIndexes1931200000000 implements MigrationInterface {
  name = 'AddPropertyGeoPriceSearchIndexes1931200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_properties_status_lat_lng_price"
      ON "properties" ("status", "latitude", "longitude", "price")
      WHERE "latitude" IS NOT NULL
        AND "longitude" IS NOT NULL
        AND "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_properties_status_price"
      ON "properties" ("status", "price")
      WHERE "deleted_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_properties_status_price"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_properties_status_lat_lng_price"`,
    );
  }
}
