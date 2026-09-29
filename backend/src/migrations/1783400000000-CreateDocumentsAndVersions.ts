import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDocumentsAndVersions1783400000000 implements MigrationInterface {
  name = 'CreateDocumentsAndVersions1783400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "documents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "owner_id" uuid NOT NULL,
        "name" character varying(255) NOT NULL,
        "description" text,
        "status" character varying(20) NOT NULL DEFAULT 'draft',
        "storage_key" character varying(512) NOT NULL,
        "mime_type" character varying(128),
        "checksum" character varying(64) NOT NULL,
        "current_version" integer NOT NULL DEFAULT 1,
        "signed_at" TIMESTAMP,
        "signed_by" uuid,
        "signed_checksum" character varying(64),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_documents_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_documents_owner_id" ON "documents" ("owner_id")`,
    );
    await queryRunner.query(`
      CREATE TABLE "document_versions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "document_id" uuid NOT NULL,
        "version" integer NOT NULL,
        "storage_key" character varying(512) NOT NULL,
        "mime_type" character varying(128),
        "checksum" character varying(64) NOT NULL,
        "uploaded_by" uuid NOT NULL,
        "change_note" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_document_versions_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_document_versions_document_version" UNIQUE ("document_id", "version"),
        CONSTRAINT "FK_document_versions_document" FOREIGN KEY ("document_id")
          REFERENCES "documents"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "document_versions"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_documents_owner_id"`);
    await queryRunner.query(`DROP TABLE "documents"`);
  }
}
