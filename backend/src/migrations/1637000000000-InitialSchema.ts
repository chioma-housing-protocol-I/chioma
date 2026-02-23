import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1637000000000 implements MigrationInterface {
  name = 'InitialSchema1637000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "webhook_endpoints" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "url" character varying NOT NULL, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_054c4cfb95223732f5939d2d546" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "rent_payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "amount" numeric(10,2) NOT NULL, "status" character varying NOT NULL DEFAULT 'pending', "paid_at" TIMESTAMP NOT NULL DEFAULT now(), "contract_id" uuid, CONSTRAINT "PK_deca3deaaf83de65c31d5efe8a3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "rent_contracts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "property_address" character varying NOT NULL, "price" numeric(10,2) NOT NULL, "user_id" uuid, CONSTRAINT "PK_8fa8e085cca895d4fb3e8e53d2e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "indexed_transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "hash" character varying NOT NULL, "value" numeric(20,8) NOT NULL, "indexed_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_cfb80c0803f671036e6df86a331" UNIQUE ("hash"), CONSTRAINT "PK_d051a6eb1500b99acecc484d867" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" ADD CONSTRAINT "FK_e19b070b0b7c5324b5c248efcdd" FOREIGN KEY ("contract_id") REFERENCES "rent_contracts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_contracts" ADD CONSTRAINT "FK_ccb630048ac85cbe7d01dd779da" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "rent_contracts" DROP CONSTRAINT "FK_ccb630048ac85cbe7d01dd779da"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" DROP CONSTRAINT "FK_e19b070b0b7c5324b5c248efcdd"`,
    );
    await queryRunner.query(`DROP TABLE "indexed_transactions"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TABLE "rent_contracts"`);
    await queryRunner.query(`DROP TABLE "rent_payments"`);
    await queryRunner.query(`DROP TABLE "webhook_endpoints"`);
  }
}
