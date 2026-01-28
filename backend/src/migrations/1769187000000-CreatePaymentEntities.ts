import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePaymentEntities1769187000000 implements MigrationInterface {
  name = 'CreatePaymentEntities1769187000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create payment_methods table
    await queryRunner.query(`
            CREATE TABLE "payment_methods" (
                "id" SERIAL NOT NULL,
                "userId" character varying NOT NULL,
                "paymentType" character varying(20) NOT NULL,
                "lastFour" character varying(4),
                "expiryDate" date,
                "isDefault" boolean NOT NULL DEFAULT false,
                "metadata" jsonb,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_3d6fb1949b8c87b6ae3a8f8b8b6" PRIMARY KEY ("id")
            )
        `);

    // Create payments table
    await queryRunner.query(`
            CREATE TABLE "payments" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" character varying NOT NULL,
                "agreementId" character varying,
                "amount" numeric(12,2) NOT NULL,
                "feeAmount" numeric(12,2) NOT NULL DEFAULT 0.00,
                "netAmount" numeric(12,2),
                "currency" character varying(3) NOT NULL DEFAULT 'NGN',
                "status" character varying NOT NULL DEFAULT 'pending',
                "paymentMethodId" integer,
                "referenceNumber" character varying,
                "processedAt" TIMESTAMP,
                "refundedAmount" numeric(12,2) NOT NULL DEFAULT 0.00,
                "refundReason" text,
                "metadata" jsonb,
                "notes" text,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_4c88e956195bba85977da21b8f4" PRIMARY KEY ("id")
            )
        `);

    // Add foreign key constraints
    await queryRunner.query(`
            ALTER TABLE "payment_methods"
            ADD CONSTRAINT "FK_1b7b4c6b8c8b8b8b8b8b8b8b8b8"
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

    await queryRunner.query(`
            ALTER TABLE "payments"
            ADD CONSTRAINT "FK_1b7b4c6b8c8b8b8b8b8b8b8b8b9"
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

    await queryRunner.query(`
            ALTER TABLE "payments"
            ADD CONSTRAINT "FK_1b7b4c6b8c8b8b8b8b8b8b8b8ba"
            FOREIGN KEY ("paymentMethodId") REFERENCES "payment_methods"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

    // Add indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_1b7b4c6b8c8b8b8b8b8b8b8b8bb" ON "payments" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1b7b4c6b8c8b8b8b8b8b8b8b8bc" ON "payments" ("processedAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_1b7b4c6b8c8b8b8b8b8b8b8b8bc"`);
    await queryRunner.query(`DROP INDEX "IDX_1b7b4c6b8c8b8b8b8b8b8b8b8bb"`);
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "FK_1b7b4c6b8c8b8b8b8b8b8b8b8ba"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "FK_1b7b4c6b8c8b8b8b8b8b8b8b8b9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_methods" DROP CONSTRAINT "FK_1b7b4c6b8c8b8b8b8b8b8b8b8b8"`,
    );
    await queryRunner.query(`DROP TABLE "payments"`);
    await queryRunner.query(`DROP TABLE "payment_methods"`);
  }
}
