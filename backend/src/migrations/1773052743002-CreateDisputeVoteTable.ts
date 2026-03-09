import { MigrationInterface, QueryRunner, Table, Index } from 'typeorm';

export class CreateDisputeVoteTable1773052743002 implements MigrationInterface {
  name = 'CreateDisputeVoteTable1773052743002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'dispute_vote',
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
            name: 'arbiter_address',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'vote',
            type: 'boolean',
          },
          {
            name: 'evidence',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'reasoning',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'voted_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'transaction_hash',
            type: 'varchar',
            length: '255',
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      'dispute_vote_dispute_id_index',
      'dispute_vote',
      ['dispute_id'],
    );

    await queryRunner.createIndex(
      'dispute_vote_arbiter_address_index',
      'dispute_vote',
      ['arbiter_address'],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('dispute_vote');
  }
}
