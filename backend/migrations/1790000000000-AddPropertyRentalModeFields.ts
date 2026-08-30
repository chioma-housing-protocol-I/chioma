import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPropertyRentalModeFields1790000000000 implements MigrationInterface {
  name = 'AddPropertyRentalModeFields1790000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enums
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE property_rental_mode_enum AS ENUM ('long_term', 'short_term', 'hybrid', 'flexible');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE cancellation_policy_enum AS ENUM ('flexible', 'moderate', 'strict');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    // Rental mode
    await queryRunner.query(
      `ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "rental_mode" property_rental_mode_enum NOT NULL DEFAULT 'long_term'`,
    );
    await queryRunner.query(
      `ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "min_stay_days" integer NOT NULL DEFAULT 1`,
    );
    await queryRunner.query(
      `ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "max_stay_days" integer`,
    );

    // Short-term pricing
    await queryRunner.query(
      `ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "nightly_rate" numeric(10,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "weekly_discount" numeric(5,2) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "monthly_discount" numeric(5,2) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "cleaning_fee" numeric(10,2) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "extra_guest_fee" numeric(10,2) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "max_guests" integer NOT NULL DEFAULT 4`,
    );

    // Booking settings
    await queryRunner.query(
      `ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "instant_booking" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "require_guest_verification" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "minimum_guest_rating" numeric(3,1) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "cancellation_policy" cancellation_policy_enum NOT NULL DEFAULT 'moderate'`,
    );
    await queryRunner.query(
      `ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "check_in_time" varchar NOT NULL DEFAULT '15:00'`,
    );
    await queryRunner.query(
      `ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "check_out_time" varchar NOT NULL DEFAULT '11:00'`,
    );
    await queryRunner.query(
      `ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "check_in_method" varchar NOT NULL DEFAULT 'lockbox'`,
    );

    // Subletting
    await queryRunner.query(
      `ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "subletting_allowed" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "subletting_approval_required" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "subletting_max_days_per_year" integer NOT NULL DEFAULT 90`,
    );
    await queryRunner.query(
      `ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "subletting_tenant_share" numeric(5,2) NOT NULL DEFAULT 60`,
    );
    await queryRunner.query(
      `ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "subletting_landlord_share" numeric(5,2) NOT NULL DEFAULT 30`,
    );

    // House rules
    await queryRunner.query(
      `ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "smoking_allowed" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "parties_allowed" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "children_allowed" boolean NOT NULL DEFAULT true`,
    );

    // AI fields
    await queryRunner.query(
      `ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "ai_pricing_suggestion" numeric(10,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "ai_optimal_mode" property_rental_mode_enum`,
    );
    await queryRunner.query(
      `ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "ai_occupancy_prediction" numeric(5,2)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const cols = [
      'rental_mode',
      'min_stay_days',
      'max_stay_days',
      'nightly_rate',
      'weekly_discount',
      'monthly_discount',
      'cleaning_fee',
      'extra_guest_fee',
      'max_guests',
      'instant_booking',
      'require_guest_verification',
      'minimum_guest_rating',
      'cancellation_policy',
      'check_in_time',
      'check_out_time',
      'check_in_method',
      'subletting_allowed',
      'subletting_approval_required',
      'subletting_max_days_per_year',
      'subletting_tenant_share',
      'subletting_landlord_share',
      'smoking_allowed',
      'parties_allowed',
      'children_allowed',
      'ai_pricing_suggestion',
      'ai_optimal_mode',
      'ai_occupancy_prediction',
    ];
    for (const col of cols) {
      await queryRunner.query(
        `ALTER TABLE "properties" DROP COLUMN IF EXISTS "${col}"`,
      );
    }
    await queryRunner.query(`DROP TYPE IF EXISTS property_rental_mode_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS cancellation_policy_enum`);
  }
}
