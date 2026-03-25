import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateRentObligationNftsTable1740330000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'rent_obligation_nfts',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'agreement_id',
            type: 'varchar',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'obligation_id',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'current_owner',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'original_landlord',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'mint_tx_hash',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'last_transfer_tx_hash',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'minted_at',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'last_transferred_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'transfer_count',
            type: 'integer',
            default: 0,
          },
          {
            name: 'status',
            type: 'varchar',
            default: "'active'",
          },
          {
            name: 'metadata_uri',
            type: 'varchar',
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

    await queryRunner.createIndex(
      'rent_obligation_nfts',
      new TableIndex({
        name: 'IDX_RENT_OBLIGATION_NFTS_CURRENT_OWNER',
        columnNames: ['current_owner'],
      }),
    );

    await queryRunner.createIndex(
      'rent_obligation_nfts',
      new TableIndex({
        name: 'IDX_RENT_OBLIGATION_NFTS_ORIGINAL_LANDLORD',
        columnNames: ['original_landlord'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('rent_obligation_nfts');
  }
}
