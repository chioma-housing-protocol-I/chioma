import { MigrationInterface, QueryRunner, Table, Index } from 'typeorm';

export class CreateDisputeEventTable1773052743003 implements MigrationInterface {
  name = 'CreateDisputeEventTable1773052743003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'dispute_event',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
          },
          {
            name: 'dispute_id',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'event_type',
            type: 'enum',
            enum: ['dispute_raised', 'arbiters_selected', 'vote_cast', 'voting_complete', 'resolution_enforced', 'appeal_filed'],
          },
          {
            name: 'event_data',
            type: 'text',
          },
          {
            name: 'timestamp',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'triggered_by',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      'dispute_event',
      new Index('dispute_event_dispute_id_index', ['dispute_id']),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('dispute_event');
  }
}
