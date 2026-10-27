import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateLoginActivitiesTable1940000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const dbType = process.env.DB_TYPE || 'postgres';
    const isPostgres = dbType === 'postgres';
    const isSqlite = dbType === 'sqlite';

    await queryRunner.createTable(
      new Table({
        name: 'login_activities',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: isPostgres ? 'gen_random_uuid()' : isSqlite ? "(lower(hex(randomblob(16))))" : 'uuid()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'email',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'login_method',
            type: isSqlite ? 'varchar' : 'enum',
            enum: isPostgres ? ['password', 'stellar', 'mfa', 'refresh_token'] : undefined,
            default: isSqlite ? "'password'" : "'password'",
          },
          {
            name: 'status',
            type: isSqlite ? 'varchar' : 'enum',
            enum: isPostgres ? ['success', 'failed', 'blocked', 'mfa_required', 'mfa_completed'] : undefined,
          },
          {
            name: 'ip_address',
            type: 'varchar',
            length: '45',
            isNullable: true,
          },
          {
            name: 'user_agent',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'country',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'city',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'device',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'browser',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'os',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'failure_reason',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'is_suspicious',
            type: 'boolean',
            default: false,
          },
          {
            name: 'anomaly_flags',
            type: isSqlite ? 'text' : 'json',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: isSqlite ? 'text' : 'json',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: isSqlite ? 'datetime' : 'timestamp',
            default: isPostgres ? 'CURRENT_TIMESTAMP' : "CURRENT_TIMESTAMP",
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'login_activities',
      new TableIndex({
        name: 'IDX_login_activities_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'login_activities',
      new TableIndex({
        name: 'IDX_login_activities_user_created',
        columnNames: ['user_id', 'created_at'],
      }),
    );

    await queryRunner.createIndex(
      'login_activities',
      new TableIndex({
        name: 'IDX_login_activities_ip_created',
        columnNames: ['ip_address', 'created_at'],
      }),
    );

    await queryRunner.createIndex(
      'login_activities',
      new TableIndex({
        name: 'IDX_login_activities_status_created',
        columnNames: ['status', 'created_at'],
      }),
    );

    // Create foreign key to users table
    if (!isSqlite) {
      await queryRunner.createForeignKey(
        'login_activities',
        new TableForeignKey({
          columnNames: ['user_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'users',
          onDelete: 'CASCADE',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('login_activities', true);
  }
}
