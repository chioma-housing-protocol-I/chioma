import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePerformanceAlertsTable1790000000003 implements MigrationInterface {
  name = 'CreatePerformanceAlertsTable1790000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "performance_alerts_severity_enum" AS ENUM ('info','warning','critical')`,
    );
    await queryRunner.query(`
      CREATE TABLE "performance_alerts" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "metric" varchar NOT NULL,
        "severity" "performance_alerts_severity_enum" NOT NULL,
        "message" text NOT NULL,
        "value" double precision,
        "threshold" double precision,
        "occurrences" int NOT NULL DEFAULT 1,
        "resolved" boolean NOT NULL DEFAULT false,
        "resolvedAt" timestamp,
        "lastSeenAt" timestamp NOT NULL DEFAULT now(),
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now()
      )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_performance_alerts_metric_resolved" ON "performance_alerts" ("metric","resolved")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "performance_alerts"`);
    await queryRunner.query(`DROP TYPE "performance_alerts_severity_enum"`);
  }
}
