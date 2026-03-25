import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class AddDisputeEnhancements1740330000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create dispute_events table
    await queryRunner.createTable(
      new Table({
        name: 'dispute_events',
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
            type: 'varchar',
            length: '100',
          },
          {
            name: 'event_type',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'event_data',
            type: 'jsonb',
          },
          {
            name: 'timestamp',
            type: 'timestamp',
          },
          {
            name: 'triggered_by',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'transaction_hash',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Add reputation and success tracking to arbiters
    await queryRunner.query(`
      ALTER TABLE arbiters
      ADD COLUMN reputation_score DECIMAL(5, 2) DEFAULT 0,
      ADD COLUMN successful_resolutions INT DEFAULT 0
    `);

    // Add vote weight and evidence to dispute_votes
    await queryRunner.query(`
      ALTER TABLE dispute_votes
      ADD COLUMN evidence TEXT,
      ADD COLUMN reasoning TEXT,
      ADD COLUMN vote_weight INT DEFAULT 1
    `);

    // Create indexes for dispute_events
    await queryRunner.createIndex(
      'dispute_events',
      new TableIndex({
        name: 'IDX_dispute_events_dispute_id',
        columnNames: ['dispute_id'],
      }),
    );

    await queryRunner.createIndex(
      'dispute_events',
      new TableIndex({
        name: 'IDX_dispute_events_event_type',
        columnNames: ['event_type'],
      }),
    );

    await queryRunner.createIndex(
      'dispute_events',
      new TableIndex({
        name: 'IDX_dispute_events_timestamp',
        columnNames: ['timestamp'],
      }),
    );

    // Create index for arbiter reputation
    await queryRunner.createIndex(
      'arbiters',
      new TableIndex({
        name: 'IDX_arbiters_reputation_score',
        columnNames: ['reputation_score'],
      }),
    );

    // Create index for active arbiters
    await queryRunner.createIndex(
      'arbiters',
      new TableIndex({
        name: 'IDX_arbiters_active',
        columnNames: ['active'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('arbiters', 'IDX_arbiters_active');
    await queryRunner.dropIndex('arbiters', 'IDX_arbiters_reputation_score');
    await queryRunner.dropIndex(
      'dispute_events',
      'IDX_dispute_events_timestamp',
    );
    await queryRunner.dropIndex(
      'dispute_events',
      'IDX_dispute_events_event_type',
    );
    await queryRunner.dropIndex(
      'dispute_events',
      'IDX_dispute_events_dispute_id',
    );

    // Remove columns from dispute_votes
    await queryRunner.query(`
      ALTER TABLE dispute_votes
      DROP COLUMN evidence,
      DROP COLUMN reasoning,
      DROP COLUMN vote_weight
    `);

    // Remove columns from arbiters
    await queryRunner.query(`
      ALTER TABLE arbiters
      DROP COLUMN reputation_score,
      DROP COLUMN successful_resolutions
    `);

    // Drop dispute_events table
    await queryRunner.dropTable('dispute_events');
  }
}
