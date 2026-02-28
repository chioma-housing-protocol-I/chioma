import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddBlockchainFieldsToEscrows1740310000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'stellar_escrows',
      new TableColumn({
        name: 'blockchain_escrow_id',
        type: 'varchar',
        length: '64',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'stellar_escrows',
      new TableColumn({
        name: 'on_chain_status',
        type: 'varchar',
        length: '20',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'stellar_escrows',
      new TableColumn({
        name: 'escrow_contract_address',
        type: 'varchar',
        length: '56',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'stellar_escrows',
      new TableColumn({
        name: 'arbiter_address',
        type: 'varchar',
        length: '56',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'stellar_escrows',
      new TableColumn({
        name: 'dispute_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'stellar_escrows',
      new TableColumn({
        name: 'dispute_reason',
        type: 'text',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'stellar_escrows',
      new TableColumn({
        name: 'blockchain_synced_at',
        type: 'timestamp',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'stellar_escrows',
      new TableColumn({
        name: 'approval_count',
        type: 'int',
        default: 0,
      }),
    );

    await queryRunner.addColumn(
      'stellar_escrows',
      new TableColumn({
        name: 'escrow_metadata',
        type: 'jsonb',
        isNullable: true,
      }),
    );

    // Add FUNDED and DISPUTED to status enum
    await queryRunner.query(`
      ALTER TYPE "stellar_escrows_status_enum" 
      ADD VALUE IF NOT EXISTS 'FUNDED';
    `);

    await queryRunner.query(`
      ALTER TYPE "stellar_escrows_status_enum" 
      ADD VALUE IF NOT EXISTS 'DISPUTED';
    `);

    // Create indexes
    await queryRunner.query(
      `CREATE INDEX idx_blockchain_escrow_id ON stellar_escrows(blockchain_escrow_id)`,
    );

    await queryRunner.query(
      `CREATE INDEX idx_dispute_id ON stellar_escrows(dispute_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX idx_dispute_id`);
    await queryRunner.query(`DROP INDEX idx_blockchain_escrow_id`);

    await queryRunner.dropColumn('stellar_escrows', 'escrow_metadata');
    await queryRunner.dropColumn('stellar_escrows', 'approval_count');
    await queryRunner.dropColumn('stellar_escrows', 'blockchain_synced_at');
    await queryRunner.dropColumn('stellar_escrows', 'dispute_reason');
    await queryRunner.dropColumn('stellar_escrows', 'dispute_id');
    await queryRunner.dropColumn('stellar_escrows', 'arbiter_address');
    await queryRunner.dropColumn('stellar_escrows', 'escrow_contract_address');
    await queryRunner.dropColumn('stellar_escrows', 'on_chain_status');
    await queryRunner.dropColumn('stellar_escrows', 'blockchain_escrow_id');
  }
}
