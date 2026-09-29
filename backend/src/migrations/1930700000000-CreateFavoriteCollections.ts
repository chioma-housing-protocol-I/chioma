import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds named favorite collections so users can organize saved properties.
 * `favorites.collection_id` is nullable; null means "Uncategorized".
 */
export class CreateFavoriteCollections1930700000000 implements MigrationInterface {
  name = 'CreateFavoriteCollections1930700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "favorite_collections" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "name" varchar(100) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_favorite_collections_id" PRIMARY KEY ("id"),
        CONSTRAINT "unique_user_collection_name" UNIQUE ("user_id", "name"),
        CONSTRAINT "FK_favorite_collections_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_favorite_collections_user_id" ON "favorite_collections" ("user_id")`,
    );
    await queryRunner.query(`
      ALTER TABLE "favorites"
        ADD COLUMN IF NOT EXISTS "collection_id" uuid NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "favorites"
        ADD CONSTRAINT "FK_favorites_collection" FOREIGN KEY ("collection_id")
          REFERENCES "favorite_collections"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_favorites_collection_id" ON "favorites" ("collection_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_favorites_collection_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "favorites" DROP CONSTRAINT IF EXISTS "FK_favorites_collection"`,
    );
    await queryRunner.query(
      `ALTER TABLE "favorites" DROP COLUMN IF EXISTS "collection_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "favorite_collections"`);
  }
}
