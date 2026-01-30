import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateProfileMetadataTable1769280000000 implements MigrationInterface {
  name = 'CreateProfileMetadataTable1769280000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'profile_metadata',
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
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'wallet_address',
            type: 'varchar',
            length: '56',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'display_name',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'bio',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'avatar_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'data_hash',
            type: 'varchar',
            length: '64',
            isNullable: false,
          },
          {
            name: 'last_synced_at',
            type: 'timestamp',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Add foreign key to users table
    await queryRunner.createForeignKey(
      'profile_metadata',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // Create indexes for fast lookup
    await queryRunner.createIndex(
      'profile_metadata',
      new TableIndex({
        name: 'idx_profile_metadata_user_id',
        columnNames: ['user_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'profile_metadata',
      new TableIndex({
        name: 'idx_profile_metadata_wallet_address',
        columnNames: ['wallet_address'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'profile_metadata',
      new TableIndex({
        name: 'idx_profile_metadata_data_hash',
        columnNames: ['data_hash'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex(
      'profile_metadata',
      'idx_profile_metadata_data_hash',
    );
    await queryRunner.dropIndex(
      'profile_metadata',
      'idx_profile_metadata_wallet_address',
    );
    await queryRunner.dropIndex(
      'profile_metadata',
      'idx_profile_metadata_user_id',
    );

    // Drop foreign key
    const table = await queryRunner.getTable('profile_metadata');
    const foreignKey = table?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('user_id') !== -1,
    );
    if (foreignKey) {
      await queryRunner.dropForeignKey('profile_metadata', foreignKey);
    }

    // Drop table
    await queryRunner.dropTable('profile_metadata');
  }
}
