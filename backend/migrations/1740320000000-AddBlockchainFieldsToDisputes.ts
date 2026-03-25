import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class AddBlockchainFieldsToDisputes1740320000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create arbiters table
    await queryRunner.createTable(
      new Table({
        name: 'arbiters',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'stellar_address',
            type: 'varchar',
            length: '100',
            isUnique: true,
          },
          {
            name: 'user_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'blockchain_added_at',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'transaction_hash',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'total_votes',
            type: 'int',
            default: 0,
          },
          {
            name: 'total_disputes_resolved',
            type: 'int',
            default: 0,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
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

    // Create dispute_votes table
    await queryRunner.createTable(
      new Table({
        name: 'dispute_votes',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'dispute_id',
            type: 'int',
          },
          {
            name: 'arbiter_id',
            type: 'int',
          },
          {
            name: 'favor_landlord',
            type: 'boolean',
          },
          {
            name: 'blockchain_voted_at',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'transaction_hash',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'comment',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['dispute_id'],
            referencedTableName: 'disputes',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['arbiter_id'],
            referencedTableName: 'arbiters',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );

    // Add blockchain fields to disputes table
    await queryRunner.query(`
      ALTER TABLE disputes
      ADD COLUMN blockchain_agreement_id VARCHAR(100),
      ADD COLUMN details_hash VARCHAR(100),
      ADD COLUMN blockchain_raised_at BIGINT,
      ADD COLUMN blockchain_resolved_at BIGINT,
      ADD COLUMN votes_favor_landlord INT DEFAULT 0,
      ADD COLUMN votes_favor_tenant INT DEFAULT 0,
      ADD COLUMN blockchain_outcome VARCHAR(50),
      ADD COLUMN transaction_hash VARCHAR(100),
      ADD COLUMN blockchain_synced_at TIMESTAMP
    `);

    // Create indexes
    await queryRunner.createIndex(
      'disputes',
      new TableIndex({
        name: 'IDX_disputes_blockchain_agreement_id',
        columnNames: ['blockchain_agreement_id'],
      }),
    );

    await queryRunner.createIndex(
      'disputes',
      new TableIndex({
        name: 'IDX_disputes_transaction_hash',
        columnNames: ['transaction_hash'],
      }),
    );

    await queryRunner.createIndex(
      'arbiters',
      new TableIndex({
        name: 'IDX_arbiters_stellar_address',
        columnNames: ['stellar_address'],
      }),
    );

    await queryRunner.createIndex(
      'dispute_votes',
      new TableIndex({
        name: 'IDX_dispute_votes_dispute_arbiter',
        columnNames: ['dispute_id', 'arbiter_id'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex(
      'dispute_votes',
      'IDX_dispute_votes_dispute_arbiter',
    );
    await queryRunner.dropIndex('arbiters', 'IDX_arbiters_stellar_address');
    await queryRunner.dropIndex('disputes', 'IDX_disputes_transaction_hash');
    await queryRunner.dropIndex(
      'disputes',
      'IDX_disputes_blockchain_agreement_id',
    );

    // Remove blockchain fields from disputes
    await queryRunner.query(`
      ALTER TABLE disputes
      DROP COLUMN blockchain_agreement_id,
      DROP COLUMN details_hash,
      DROP COLUMN blockchain_raised_at,
      DROP COLUMN blockchain_resolved_at,
      DROP COLUMN votes_favor_landlord,
      DROP COLUMN votes_favor_tenant,
      DROP COLUMN blockchain_outcome,
      DROP COLUMN transaction_hash,
      DROP COLUMN blockchain_synced_at
    `);

    // Drop tables
    await queryRunner.dropTable('dispute_votes');
    await queryRunner.dropTable('arbiters');
  }
}
