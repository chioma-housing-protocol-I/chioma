import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateAnchorTables1740020000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'supported_currencies',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'code',
            type: 'varchar',
            length: '10',
            isUnique: true,
          },
          {
            name: 'name',
            type: 'varchar',
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'anchor_url',
            type: 'varchar',
          },
          {
            name: 'stellar_asset_code',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'stellar_asset_issuer',
            type: 'varchar',
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

    await queryRunner.createTable(
      new Table({
        name: 'anchor_transactions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'anchor_transaction_id',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['deposit', 'withdrawal'],
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
            default: "'pending'",
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 20,
            scale: 7,
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '10',
          },
          {
            name: 'wallet_address',
            type: 'varchar',
          },
          {
            name: 'payment_method',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'destination',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'stellar_transaction_id',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'memo',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
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
      'anchor_transactions',
      new TableIndex({
        name: 'IDX_ANCHOR_WALLET_STATUS',
        columnNames: ['wallet_address', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'anchor_transactions',
      new TableIndex({
        name: 'IDX_ANCHOR_TRANSACTION_ID',
        columnNames: ['anchor_transaction_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('anchor_transactions');
    await queryRunner.dropTable('supported_currencies');
  }
}
