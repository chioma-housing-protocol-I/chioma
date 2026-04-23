import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Add full-text search GIN index and geolocation composite index
 * to the properties table for issue #836 – Advanced Property Filtering.
 *
 * Changes:
 *  1. Adds a generated `search_vector` tsvector column populated from title +
 *     description + address + city + state, kept up-to-date via a trigger.
 *  2. Creates a GIN index on `search_vector` for fast full-text queries.
 *  3. Creates a B-tree composite index on (latitude, longitude) to accelerate
 *     geolocation proximity filtering.
 *  4. Creates an index on amenity `name` for amenity-based filtering.
 */
export class AddPropertySearchIndexes1783000000000 implements MigrationInterface {
  name = 'AddPropertySearchIndexes1783000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add the tsvector search column
    await queryRunner.query(`
      ALTER TABLE "properties"
      ADD COLUMN IF NOT EXISTS "search_vector" tsvector
    `);

    // 2. Populate the column with existing data
    await queryRunner.query(`
      UPDATE "properties"
      SET "search_vector" =
        to_tsvector('english',
          coalesce(title, '') || ' ' ||
          coalesce(description, '') || ' ' ||
          coalesce(address, '') || ' ' ||
          coalesce(city, '') || ' ' ||
          coalesce(state, '') || ' ' ||
          coalesce(country, '')
        )
    `);

    // 3. Create GIN index on the search vector
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_properties_search_vector"
      ON "properties" USING GIN ("search_vector")
    `);

    // 4. Create trigger function to keep search_vector up-to-date on INSERT/UPDATE
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION properties_search_vector_update()
      RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        NEW.search_vector :=
          to_tsvector('english',
            coalesce(NEW.title, '') || ' ' ||
            coalesce(NEW.description, '') || ' ' ||
            coalesce(NEW.address, '') || ' ' ||
            coalesce(NEW.city, '') || ' ' ||
            coalesce(NEW.state, '') || ' ' ||
            coalesce(NEW.country, '')
          );
        RETURN NEW;
      END;
      $$
    `);

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS "properties_search_vector_trigger" ON "properties"
    `);

    await queryRunner.query(`
      CREATE TRIGGER "properties_search_vector_trigger"
      BEFORE INSERT OR UPDATE ON "properties"
      FOR EACH ROW EXECUTE FUNCTION properties_search_vector_update()
    `);

    // 5. Composite index on (latitude, longitude) for geolocation proximity queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_properties_lat_lng"
      ON "properties" (latitude, longitude)
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
    `);

    // 6. Index on amenity name for amenity-based filtering
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_property_amenities_name"
      ON "property_amenities" (name)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_property_amenities_name"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_properties_lat_lng"`);
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "properties_search_vector_trigger" ON "properties"`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS properties_search_vector_update()`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_properties_search_vector"`,
    );
    await queryRunner.query(
      `ALTER TABLE "properties" DROP COLUMN IF EXISTS "search_vector"`,
    );
  }
}
