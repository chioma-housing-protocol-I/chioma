import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

export class AddEscrowEnhancements1740600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create escrow_signatures table
    await queryRunner.createTable(
      new Table({
        name: 'escrow_signatures',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'escrow_id',
            type: 'int',
          },
          {
            name: 'signer_address',
            type: 'varchar',
            length: '56',
          },
          {
            name: 'signature',
            type: 'text',
          },
          {
            name: 'signed_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'is_valid',
            type: 'boolean',
            default: true,
          },
          {
            name: 'signature_type',
            type: 'varchar',
            length: '20',
            default: "'release'",
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create escrow_conditions table
    await queryRunner.createTable(
      new Table({
        name: 'escrow_conditions',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'escrow_id',
            type: 'int',
          },
          {
            name: 'condition_type',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'parameters',
            type: 'jsonb',
          },
          {
            name: 'satisfied',
            type: 'boolean',
            default: false,
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
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'validation_result',
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

    // Add new columns to stellar_escrows table
    await queryRunner.query(`
      ALTER TABLE stellar_escrows
      ADD COLUMN is_multi_sig BOOLEAN DEFAULT false,
      ADD COLUMN required_signatures INT DEFAULT 1,
      ADD COLUMN participants TEXT,
      ADD COLUMN release_time BIGINT,
      ADD COLUMN is_time_locked BOOLEAN DEFAULT false,
      ADD COLUMN linked_dispute_id VARCHAR(100),
      ADD COLUMN dispute_integrated BOOLEAN DEFAULT false
    `);

    // Create foreign keys
    await queryRunner.createForeignKey(
      'escrow_signatures',
      new TableForeignKey({
        columnNames: ['escrow_id'],
        referencedTableName: 'stellar_escrows',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'escrow_conditions',
      new TableForeignKey({
        columnNames: ['escrow_id'],
        referencedTableName: 'stellar_escrows',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Create indexes
    await queryRunner.createIndex(
      'escrow_signatures',
      new TableIndex({
        name: 'IDX_escrow_signatures_escrow_id',
        columnNames: ['escrow_id'],
      }),
    );

    await queryRunner.createIndex(
      'escrow_signatures',
      new TableIndex({
        name: 'IDX_escrow_signatures_signer',
        columnNames: ['signer_address'],
      }),
    );

    await queryRunner.createIndex(
      'escrow_signatures',
      new TableIndex({
        name: 'IDX_escrow_signatures_escrow_signer',
        columnNames: ['escrow_id', 'signer_address'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'escrow_conditions',
      new TableIndex({
        name: 'IDX_escrow_conditions_escrow_id',
        columnNames: ['escrow_id'],
      }),
    );

    await queryRunner.createIndex(
      'escrow_conditions',
      new TableIndex({
        name: 'IDX_escrow_conditions_type',
        columnNames: ['condition_type'],
      }),
    );

    await queryRunner.createIndex(
      'escrow_conditions',
      new TableIndex({
        name: 'IDX_escrow_conditions_satisfied',
        columnNames: ['satisfied'],
      }),
    );

    await queryRunner.createIndex(
      'stellar_escrows',
      new TableIndex({
        name: 'IDX_stellar_escrows_multi_sig',
        columnNames: ['is_multi_sig'],
      }),
    );

    await queryRunner.createIndex(
      'stellar_escrows',
      new TableIndex({
        name: 'IDX_stellar_escrows_time_locked',
        columnNames: ['is_time_locked'],
      }),
    );

    await queryRunner.createIndex(
      'stellar_escrows',
      new TableIndex({
        name: 'IDX_stellar_escrows_linked_dispute',
        columnNames: ['linked_dispute_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex(
      'stellar_escrows',
      'IDX_stellar_escrows_linked_dispute',
    );
    await queryRunner.dropIndex(
      'stellar_escrows',
      'IDX_stellar_escrows_time_locked',
    );
    await queryRunner.dropIndex(
      'stellar_escrows',
      'IDX_stellar_escrows_multi_sig',
    );
    await queryRunner.dropIndex(
      'escrow_conditions',
      'IDX_escrow_conditions_satisfied',
    );
    await queryRunner.dropIndex(
      'escrow_conditions',
      'IDX_escrow_conditions_type',
    );
    await queryRunner.dropIndex(
      'escrow_conditions',
      'IDX_escrow_conditions_escrow_id',
    );
    await queryRunner.dropIndex(
      'escrow_signatures',
      'IDX_escrow_signatures_escrow_signer',
    );
    await queryRunner.dropIndex(
      'escrow_signatures',
      'IDX_escrow_signatures_signer',
    );
    await queryRunner.dropIndex(
      'escrow_signatures',
      'IDX_escrow_signatures_escrow_id',
    );

    // Drop foreign keys
    const escrowSignaturesTable =
      await queryRunner.getTable('escrow_signatures');
    const escrowConditionsTable =
      await queryRunner.getTable('escrow_conditions');

    if (escrowSignaturesTable) {
      const foreignKey = escrowSignaturesTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('escrow_id') !== -1,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey('escrow_signatures', foreignKey);
      }
    }

    if (escrowConditionsTable) {
      const foreignKey = escrowConditionsTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('escrow_id') !== -1,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey('escrow_conditions', foreignKey);
      }
    }

    // Drop tables
    await queryRunner.dropTable('escrow_conditions');
    await queryRunner.dropTable('escrow_signatures');

    // Remove columns from stellar_escrows
    await queryRunner.query(`
      ALTER TABLE stellar_escrows
      DROP COLUMN is_multi_sig,
      DROP COLUMN required_signatures,
      DROP COLUMN participants,
      DROP COLUMN release_time,
      DROP COLUMN is_time_locked,
      DROP COLUMN linked_dispute_id,
      DROP COLUMN dispute_integrated
    `);
  }
}
