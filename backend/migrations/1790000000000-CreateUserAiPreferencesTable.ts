import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateUserAiPreferencesTable1790000000000 implements MigrationInterface {
  name = 'CreateUserAiPreferencesTable1790000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'user_ai_preferences',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isUnique: true,
          },
          {
            name: 'preferred_city',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'max_budget',
            type: 'decimal',
            precision: 12,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'min_budget',
            type: 'decimal',
            precision: 12,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'bedrooms',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'bathrooms',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'preferred_type',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'pets_required',
            type: 'boolean',
            default: false,
          },
          {
            name: 'parking_required',
            type: 'boolean',
            default: false,
          },
          {
            name: 'furnished_required',
            type: 'boolean',
            default: false,
          },
          {
            name: 'preferred_amenities',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'user_ai_preferences',
      new TableIndex({
        columnNames: ['user_id'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('user_ai_preferences');
  }
}
