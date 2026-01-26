import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateDisputesTables1769374864408 implements MigrationInterface {
    name = 'CreateDisputesTables1769374864408'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "dispute_evidence" ("id" SERIAL NOT NULL, "dispute_id" uuid NOT NULL, "uploaded_by" uuid NOT NULL, "file_url" text NOT NULL, "file_name" text NOT NULL, "file_type" character varying(100) NOT NULL, "file_size" integer NOT NULL, "description" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6b34f65b55c04db5a6929bff0ab" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "dispute_comments" ("id" SERIAL NOT NULL, "dispute_id" uuid NOT NULL, "user_id" uuid NOT NULL, "content" text NOT NULL, "is_internal" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_45aee7f5feb4d71f19db7983f91" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "disputes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "dispute_id" character varying(36) NOT NULL, "agreement_id" uuid NOT NULL, "initiated_by" uuid NOT NULL, "dispute_type" character varying(50) NOT NULL, "requested_amount" numeric(12,2), "description" text NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'OPEN', "resolution" text, "resolved_by" uuid, "resolved_at" TIMESTAMP, "metadata" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_8dce736a5b4967c790d992407b1" UNIQUE ("dispute_id"), CONSTRAINT "PK_3c97580d01c1a4b0b345c42a107" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "dispute_evidence" ADD CONSTRAINT "FK_e5002398b258a9c604b22e5bc84" FOREIGN KEY ("dispute_id") REFERENCES "disputes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "dispute_evidence" ADD CONSTRAINT "FK_69fe4c674de2ff4493321c84bf8" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "dispute_comments" ADD CONSTRAINT "FK_73997dfdd92c52e8e272daf993f" FOREIGN KEY ("dispute_id") REFERENCES "disputes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "dispute_comments" ADD CONSTRAINT "FK_a95e744fae69ed9085c11f06d53" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "disputes" ADD CONSTRAINT "FK_88ee5cde660b017bc762140624f" FOREIGN KEY ("agreement_id") REFERENCES "rent_agreements"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "disputes" ADD CONSTRAINT "FK_c94b97e75b3247ebafb25ed78d9" FOREIGN KEY ("initiated_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "disputes" ADD CONSTRAINT "FK_573e2d4b2acb74b7f74a4d4735a" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "disputes" DROP CONSTRAINT "FK_573e2d4b2acb74b7f74a4d4735a"`);
        await queryRunner.query(`ALTER TABLE "disputes" DROP CONSTRAINT "FK_c94b97e75b3247ebafb25ed78d9"`);
        await queryRunner.query(`ALTER TABLE "disputes" DROP CONSTRAINT "FK_88ee5cde660b017bc762140624f"`);
        await queryRunner.query(`ALTER TABLE "dispute_comments" DROP CONSTRAINT "FK_a95e744fae69ed9085c11f06d53"`);
        await queryRunner.query(`ALTER TABLE "dispute_comments" DROP CONSTRAINT "FK_73997dfdd92c52e8e272daf993f"`);
        await queryRunner.query(`ALTER TABLE "dispute_evidence" DROP CONSTRAINT "FK_69fe4c674de2ff4493321c84bf8"`);
        await queryRunner.query(`ALTER TABLE "dispute_evidence" DROP CONSTRAINT "FK_e5002398b258a9c604b22e5bc84"`);
        await queryRunner.query(`DROP TABLE "disputes"`);
        await queryRunner.query(`DROP TABLE "dispute_comments"`);
        await queryRunner.query(`DROP TABLE "dispute_evidence"`);
    }

}
