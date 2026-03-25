import { MigrationInterface, QueryRunner } from "typeorm";

export class AddKycStatusToUsers1770500000000 implements MigrationInterface {
    name = 'AddKycStatusToUsers1770500000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."users_kyc_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'NEEDS_INFO')`);
        await queryRunner.query(`ALTER TABLE "users" ADD "kyc_status" "public"."users_kyc_status_enum" NOT NULL DEFAULT 'PENDING'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "kyc_status"`);
        await queryRunner.query(`DROP TYPE "public"."users_kyc_status_enum"`);
    }
}
