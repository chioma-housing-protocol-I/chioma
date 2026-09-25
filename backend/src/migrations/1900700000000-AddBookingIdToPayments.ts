import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the missing `booking_id` column to `payments`.
 *
 * The Payment entity has declared `bookingId` (mapped to `booking_id`) but no
 * migration ever created the column, so every SELECT built from the entity —
 * including GET /payments — failed with:
 *   QueryFailedError: column payment.booking_id does not exist
 *
 * Nullable varchar with no FK constraint, matching the entity and the sibling
 * `agreement_id` column ("Reference to booking (no FK constraint)").
 */
export class AddBookingIdToPayments1900700000000 implements MigrationInterface {
  name = 'AddBookingIdToPayments1900700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "payments"
      ADD COLUMN IF NOT EXISTS "booking_id" character varying
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "payments"
      DROP COLUMN IF EXISTS "booking_id"
    `);
  }
}
