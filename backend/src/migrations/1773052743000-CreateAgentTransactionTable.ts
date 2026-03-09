import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateAgentTransactionTable1773052743000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'agent_transactions',
        columns: [
          {
            name: 'transaction_id',
            type: 'varchar',
            length: '128',
            isPrimary: true,
          },
          {
            name: 'agent_address',
            type: 'varchar',
            length: '56',
          },
          {
            name: 'parties',
            type: 'text',
          },
          {
            name: 'completed',
            type: 'boolean',
            default: false,
          },
          {
            name: 'blockchain_hash',
            type: 'varchar',
            length: '64',
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
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'agent_transactions',
      new TableIndex({
        name: 'IDX_agent_transactions_agent',
        columnNames: ['agent_address'],
      }),
    );

    await queryRunner.createIndex(
      'agent_transactions',
      new TableIndex({
        name: 'IDX_agent_transactions_completed',
        columnNames: ['completed'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('agent_transactions');
  }
}
