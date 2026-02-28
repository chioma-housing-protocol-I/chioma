import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserSoftDelete1740235212000 implements MigrationInterface {
    name = 'AddUserSoftDelete1740235212000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "deleted_at" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "deleted_at"`);
    }
}
