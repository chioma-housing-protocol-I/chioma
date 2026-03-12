import { MigrationInterface, QueryRunner, Table, TableColumn } from 'typeorm';

export class AddEscrowSignatureAndConditionTables1770600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new columns to stellar_escrows for enhanced escrow features
    await queryRunner.addColumn(
      'stellar_escrows',
      new TableColumn({
        name: 'is_multi_sig',
        type: 'boolean',
        default: false,
      }),
    );
    await queryRunner.addColumn(
      'stellar_escrows',
      new TableColumn({
        name: 'required_signatures',
        type: 'int',
        default: 1,
      }),
    );
    await queryRunner.addColumn(
      'stellar_escrows',
      new TableColumn({
        name: 'participants',
        type: 'text',
        isNullable: true,
      }),
    );
    await queryRunner.addColumn(
      'stellar_escrows',
      new TableColumn({
        name: 'release_time',
        type: 'bigint',
        isNullable: true,
      }),
    );
    await queryRunner.addColumn(
      'stellar_escrows',
      new TableColumn({
        name: 'is_time_locked',
        type: 'boolean',
        default: false,
      }),
    );
    await queryRunner.addColumn(
      'stellar_escrows',
      new TableColumn({
        name: 'linked_dispute_id',
        type: 'uuid',
        isNullable: true,
      }),
    );
    await queryRunner.addColumn(
      'stellar_escrows',
      new TableColumn({
        name: 'dispute_integrated',
        type: 'boolean',
        default: false,
      }),
    );

    // Create condition_type enum for stellar_escrow_conditions
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "stellar_escrow_conditions_condition_type_enum" AS ENUM (
          'time_lock',
          'dispute_resolution',
          'external_validation',
          'milestone_completion'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create stellar_escrow_signatures table
    await queryRunner.createTable(
      new Table({
        name: 'stellar_escrow_signatures',
        columns: [
          {
            name: 'id',
            type: 'serial',
            isPrimary: true,
          },
          {
            name: 'escrow_id',
            type: 'varchar',
            length: '128',
            isNullable: false,
          },
          {
            name: 'stellar_escrow_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'signer_address',
            type: 'varchar',
            length: '256',
            isNullable: false,
          },
          {
            name: 'signature',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'signed_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'is_valid',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
        ],
        foreignKeys: [
          {
            columnNames: ['stellar_escrow_id'],
            referencedTableName: 'stellar_escrows',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_escrow_signatures_escrow_id" ON "stellar_escrow_signatures" ("escrow_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_escrow_signatures_signer_address" ON "stellar_escrow_signatures" ("signer_address")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_escrow_signatures_stellar_escrow_id" ON "stellar_escrow_signatures" ("stellar_escrow_id")`,
    );

    // Create stellar_escrow_conditions table
    await queryRunner.createTable(
      new Table({
        name: 'stellar_escrow_conditions',
        columns: [
          {
            name: 'id',
            type: 'serial',
            isPrimary: true,
          },
          {
            name: 'escrow_id',
            type: 'varchar',
            length: '128',
            isNullable: false,
          },
          {
            name: 'stellar_escrow_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'condition_type',
            type: 'stellar_escrow_conditions_condition_type_enum',
            isNullable: false,
          },
          {
            name: 'parameters',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'satisfied',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'satisfied_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'required',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
        foreignKeys: [
          {
            columnNames: ['stellar_escrow_id'],
            referencedTableName: 'stellar_escrows',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_escrow_conditions_escrow_id" ON "stellar_escrow_conditions" ("escrow_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_escrow_conditions_type" ON "stellar_escrow_conditions" ("condition_type")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_escrow_conditions_stellar_escrow_id" ON "stellar_escrow_conditions" ("stellar_escrow_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('stellar_escrow_conditions', true);
    await queryRunner.dropTable('stellar_escrow_signatures', true);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "stellar_escrow_conditions_condition_type_enum"`,
    );

    await queryRunner.dropColumn('stellar_escrows', 'dispute_integrated');
    await queryRunner.dropColumn('stellar_escrows', 'linked_dispute_id');
    await queryRunner.dropColumn('stellar_escrows', 'is_time_locked');
    await queryRunner.dropColumn('stellar_escrows', 'release_time');
    await queryRunner.dropColumn('stellar_escrows', 'participants');
    await queryRunner.dropColumn('stellar_escrows', 'required_signatures');
    await queryRunner.dropColumn('stellar_escrows', 'is_multi_sig');
  }
}
