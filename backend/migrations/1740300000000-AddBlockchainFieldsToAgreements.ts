import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddBlockchainFieldsToAgreements1740300000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'rent_agreements',
      new TableColumn({
        name: 'blockchain_agreement_id',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'rent_agreements',
      new TableColumn({
        name: 'on_chain_status',
        type: 'varchar',
        length: '50',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'rent_agreements',
      new TableColumn({
        name: 'transaction_hash',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'rent_agreements',
      new TableColumn({
        name: 'blockchain_synced_at',
        type: 'timestamp',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'rent_agreements',
      new TableColumn({
        name: 'payment_split_config',
        type: 'jsonb',
        isNullable: true,
      }),
    );

    await queryRunner.query(
      `CREATE INDEX idx_blockchain_agreement_id ON rent_agreements(blockchain_agreement_id)`,
    );

    await queryRunner.query(
      `CREATE INDEX idx_transaction_hash ON rent_agreements(transaction_hash)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX idx_transaction_hash`);
    await queryRunner.query(`DROP INDEX idx_blockchain_agreement_id`);
    await queryRunner.dropColumn('rent_agreements', 'payment_split_config');
    await queryRunner.dropColumn('rent_agreements', 'blockchain_synced_at');
    await queryRunner.dropColumn('rent_agreements', 'transaction_hash');
    await queryRunner.dropColumn('rent_agreements', 'on_chain_status');
    await queryRunner.dropColumn('rent_agreements', 'blockchain_agreement_id');
  }
}
