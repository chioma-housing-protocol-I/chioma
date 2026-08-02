import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePropertyAvailabilityTable1790000000000 implements MigrationInterface {
  name = 'CreatePropertyAvailabilityTable1790000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "property_availability" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "property_id" uuid NOT NULL,
        "date" date NOT NULL,
        "available" boolean NOT NULL DEFAULT true,
        "custom_price" numeric(12,2),
        "notes" text,
        "blocked_by_booking_id" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_property_availability" PRIMARY KEY ("id"),
        CONSTRAINT "uq_property_availability" UNIQUE ("property_id", "date"),
        CONSTRAINT "fk_property_availability_property"
          FOREIGN KEY ("property_id")
          REFERENCES "properties"("id")
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_property_availability_property_date"
        ON "property_availability" ("property_id", "date")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_property_availability_property_date"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "property_availability"`);
  }
}
