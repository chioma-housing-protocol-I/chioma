import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateFeedbackAndApiKeysTables1770000000000 implements MigrationInterface {
  name = 'CreateFeedbackAndApiKeysTables1770000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'feedback',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'email', type: 'varchar', length: '255', isNullable: true },
          { name: 'message', type: 'text', isNullable: false },
          {
            name: 'type',
            type: 'varchar',
            length: '50',
            isNullable: false,
            default: "'general'",
          },
          { name: 'user_id', type: 'uuid', isNullable: true },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            isNullable: false,
            default: 'NOW()',
          },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'feedback',
      new TableIndex({
        name: 'IDX_feedback_created_at',
        columnNames: ['created_at'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'api_keys',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'user_id', type: 'uuid', isNullable: false },
          { name: 'name', type: 'varchar', length: '100', isNullable: false },
          {
            name: 'key_hash',
            type: 'varchar',
            length: '64',
            isNullable: false,
          },
          {
            name: 'key_prefix',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'last_used_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            isNullable: false,
            default: 'NOW()',
          },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
            isNullable: false,
            default: 'NOW()',
          },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'api_keys',
      new TableIndex({
        name: 'IDX_api_keys_user_id',
        columnNames: ['user_id'],
      }),
    );
    await queryRunner.createIndex(
      'api_keys',
      new TableIndex({
        name: 'IDX_api_keys_key_hash',
        columnNames: ['key_hash'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('feedback');
    await queryRunner.dropTable('api_keys');
  }
}
