import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateArbiterTable1773052743001 implements MigrationInterface {
  name = 'CreateArbiterTable1773052743001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'arbiter',
        columns: [
          {
            name: 'address',
            type: 'varchar',
            length: '255',
            isPrimary: true,
          },
          {
            name: 'qualifications',
            type: 'text',
          },
          {
            name: 'specialization',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'stake_amount',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'reputation_score',
            type: 'int',
            default: 0,
          },
          {
            name: 'total_disputes',
            type: 'int',
            default: 0,
          },
          {
            name: 'successful_resolutions',
            type: 'int',
            default: 0,
          },
          {
            name: 'registered_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'last_active_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('arbiter');
  }
}
