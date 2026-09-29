import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Ensures the "arbiters" and "dispute_votes" tables exist before
 * AddDisputeEnhancements1740330000001 alters them. Both tables are otherwise
 * only (re)created later by UpdateKycEncryptionSchema1774292331248, whose
 * timestamp runs after this one, which caused "relation ... does not exist"
 * on a fresh database.
 */
export class CreateArbitersTable1740325000000 implements MigrationInterface {
  name = 'CreateArbitersTable1740325000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "arbiters" (
        "id" SERIAL NOT NULL,
        "stellar_address" character varying NOT NULL,
        "user_id" integer,
        "active" boolean NOT NULL DEFAULT true,
        "blockchain_added_at" bigint,
        "transaction_hash" character varying,
        "total_votes" integer NOT NULL DEFAULT '0',
        "total_disputes_resolved" integer NOT NULL DEFAULT '0',
        "metadata" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_c3a4db9ab3e3cf2685439193f52" UNIQUE ("stellar_address"),
        CONSTRAINT "PK_9e4a6de1ff7b02688c18647c56a" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "dispute_votes" (
        "id" SERIAL NOT NULL,
        "dispute_id" integer NOT NULL,
        "arbiter_id" integer NOT NULL,
        "favor_landlord" boolean NOT NULL,
        "blockchain_voted_at" bigint,
        "transaction_hash" character varying,
        "comment" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_f6ace6c9738c3181b1baa9978b2" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "dispute_votes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "arbiters"`);
  }
}
