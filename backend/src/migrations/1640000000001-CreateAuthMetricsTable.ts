import { MigrationInterface, QueryRunner, Table, Index } from 'typeorm';

export class CreateAuthMetricsTable1640000000001 implements MigrationInterface {
  name = 'CreateAuthMetricsTable1640000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'auth_metrics',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'auth_method',
            type: 'enum',
            enum: ['password', 'stellar'],
            isNullable: false,
          },
          {
            name: 'success',
            type: 'boolean',
            isNullable: false,
          },
          {
            name: 'duration',
            type: 'int',
            isNullable: false,
            comment: 'Response time in milliseconds',
          },
          {
            name: 'ip_address',
            type: 'varchar',
            length: '45',
            isNullable: true,
            comment: 'Client IP address',
          },
          {
            name: 'user_agent',
            type: 'text',
            isNullable: true,
            comment: 'User agent string',
          },
          {
            name: 'error_message',
            type: 'text',
            isNullable: true,
            comment: 'Error message if authentication failed',
          },
          {
            name: 'timestamp',
            type: 'timestamp with time zone',
            isNullable: false,
            default: 'NOW()',
            comment: 'When the authentication attempt occurred',
          },
        ],
      }),
      true,
    );

    // Create indexes for performance using raw SQL
    await queryRunner.query(`
      CREATE INDEX "IDX_auth_metrics_timestamp" ON "auth_metrics" ("timestamp")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_auth_metrics_auth_method" ON "auth_metrics" ("auth_method")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_auth_metrics_success" ON "auth_metrics" ("success")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_auth_metrics_timestamp_method" ON "auth_metrics" ("timestamp", "auth_method")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('auth_metrics');
  }
}
