import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Trigram GIN indexes for the property search endpoint's
 * substring city/state filters.
 *
 * `SearchService.buildPropertyQuery` (search.service.ts, backing
 * `GET /search/properties`) filters with
 * `property.city ILIKE '%...%'` / `property.state ILIKE '%...%'` to support
 * partial matches (see search.service.spec.ts). A leading `%` wildcard
 * can't be served by a plain or expression btree index — including the
 * `LOWER(city)` index from migration 1930000000002, which only helps the
 * properties module's exact-match search — so every text search on this
 * endpoint fell back to a sequential scan over `properties`.
 *
 * pg_trgm's GIN trigram indexes do support arbitrary substring ILIKE
 * lookups, so this adds one per column without touching query code or
 * existing substring-match behavior.
 */
export class AddPropertyCityStateTrigramIndexes1931500000000
  implements MigrationInterface
{
  name = 'AddPropertyCityStateTrigramIndexes1931500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_properties_city_trgm"
      ON "properties" USING GIN ("city" gin_trgm_ops)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_properties_state_trgm"
      ON "properties" USING GIN ("state" gin_trgm_ops)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_properties_state_trgm"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_properties_city_trgm"`);
  }
}
