import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBookingsTable1900300000000 implements MigrationInterface {
  name = 'CreateBookingsTable1900300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "bookings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "property_id" uuid NOT NULL,
        "guest_id" uuid NOT NULL,
        "check_in_date" date NOT NULL,
        "check_out_date" date NOT NULL,
        "guests" integer NOT NULL DEFAULT 1,
        "special_requests" text,
        "payment_method" character varying NOT NULL DEFAULT 'card',
        "total_amount" numeric(12,2) NOT NULL,
        "currency" character varying NOT NULL DEFAULT 'USD',
        "status" character varying NOT NULL DEFAULT 'pending',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_bookings_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_bookings_property" FOREIGN KEY ("property_id")
          REFERENCES "properties"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_bookings_guest" FOREIGN KEY ("guest_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_bookings_property_id" ON "bookings" ("property_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bookings_guest_id" ON "bookings" ("guest_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bookings_status" ON "bookings" ("status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_bookings_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_bookings_guest_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_bookings_property_id"`);
    await queryRunner.query(`DROP TABLE "bookings"`);
  }
}
