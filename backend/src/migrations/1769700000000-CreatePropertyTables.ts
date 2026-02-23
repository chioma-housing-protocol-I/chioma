import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePropertyTables1769700000000 implements MigrationInterface {
  name = 'CreatePropertyTables1769700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enums (IF NOT EXISTS to handle partial migrations)
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."properties_type_enum" AS ENUM('apartment', 'house', 'commercial', 'land', 'other');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."properties_status_enum" AS ENUM('draft', 'published', 'rented', 'archived');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."rental_units_status_enum" AS ENUM('available', 'occupied', 'maintenance');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create properties table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "properties" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying NOT NULL,
        "description" text,
        "type" "public"."properties_type_enum" NOT NULL DEFAULT 'apartment',
        "status" "public"."properties_status_enum" NOT NULL DEFAULT 'draft',
        "latitude" numeric(10,7),
        "longitude" numeric(10,7),
        "address" character varying,
        "city" character varying,
        "state" character varying,
        "postal_code" character varying,
        "country" character varying,
        "price" numeric(12,2) NOT NULL,
        "currency" character varying NOT NULL DEFAULT 'USD',
        "bedrooms" integer,
        "bathrooms" integer,
        "area" numeric(10,2),
        "floor" integer,
        "is_furnished" boolean NOT NULL DEFAULT false,
        "has_parking" boolean NOT NULL DEFAULT false,
        "pets_allowed" boolean NOT NULL DEFAULT false,
        "metadata" jsonb,
        "owner_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_properties" PRIMARY KEY ("id")
      )
    `);

    // Create property_images table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "property_images" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "url" character varying NOT NULL,
        "sort_order" integer NOT NULL DEFAULT 0,
        "is_primary" boolean NOT NULL DEFAULT false,
        "property_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_property_images" PRIMARY KEY ("id")
      )
    `);

    // Create property_amenities table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "property_amenities" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "icon" character varying,
        "property_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_property_amenities" PRIMARY KEY ("id")
      )
    `);

    // Create rental_units table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "rental_units" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "unit_number" character varying NOT NULL,
        "floor" integer,
        "bedrooms" integer,
        "bathrooms" integer,
        "area" numeric(10,2),
        "price" numeric(12,2) NOT NULL,
        "status" "public"."rental_units_status_enum" NOT NULL DEFAULT 'available',
        "property_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_rental_units" PRIMARY KEY ("id")
      )
    `);

    // Add foreign key constraints (skip if already exists)
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "properties" ADD CONSTRAINT "FK_properties_owner"
        FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "property_images" ADD CONSTRAINT "FK_property_images_property"
        FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "property_amenities" ADD CONSTRAINT "FK_property_amenities_property"
        FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "rental_units" ADD CONSTRAINT "FK_rental_units_property"
        FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create indexes for common queries
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_properties_owner_id" ON "properties" ("owner_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_properties_status" ON "properties" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_properties_type" ON "properties" ("type")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_properties_city" ON "properties" ("city")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_properties_price" ON "properties" ("price")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_properties_price"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_properties_city"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_properties_type"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_properties_status"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_properties_owner_id"`,
    );

    // Drop tables (cascades will handle foreign keys)
    await queryRunner.query(`DROP TABLE IF EXISTS "rental_units"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "property_amenities"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "property_images"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "properties"`);

    // Drop enums
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."rental_units_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."properties_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."properties_type_enum"`,
    );
  }
}
