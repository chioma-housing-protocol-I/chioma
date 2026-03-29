import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class AddPropertyVirtualTours1775000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasVirtualTourColumn = await queryRunner.hasColumn(
      'properties',
      'virtual_tour_url',
    );

    if (!hasVirtualTourColumn) {
      await queryRunner.addColumn(
        'properties',
        new TableColumn({
          name: 'virtual_tour_url',
          type: 'varchar',
          isNullable: true,
        }),
      );
    }

    const hasEngagementTable = await queryRunner.hasTable('property_tour_engagements');
    if (!hasEngagementTable) {
      await queryRunner.createTable(
        new Table({
          name: 'property_tour_engagements',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              generationStrategy: 'uuid',
              default: queryRunner.connection.options.type === 'postgres'
                ? 'uuid_generate_v4()'
                : "lower(hex(randomblob(16)))",
            },
            { name: 'property_id', type: 'uuid' },
            { name: 'user_id', type: 'uuid', isNullable: true },
            { name: 'session_id', type: 'varchar', isNullable: true },
            { name: 'provider', type: 'varchar', isNullable: true },
            { name: 'event_type', type: 'varchar' },
            { name: 'duration_seconds', type: 'int', isNullable: true },
            { name: 'device_type', type: 'varchar', isNullable: true },
            { name: 'source', type: 'varchar', isNullable: true },
            {
              name: 'metadata',
              type:
                queryRunner.connection.options.type === 'postgres' ? 'jsonb' : 'text',
              isNullable: true,
            },
            {
              name: 'created_at',
              type: queryRunner.connection.options.type === 'postgres' ? 'timestamptz' : 'datetime',
              default:
                queryRunner.connection.options.type === 'postgres'
                  ? 'CURRENT_TIMESTAMP'
                  : "datetime('now')",
            },
          ],
        }),
      );

      await queryRunner.createForeignKey(
        'property_tour_engagements',
        new TableForeignKey({
          columnNames: ['property_id'],
          referencedTableName: 'properties',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );

      await queryRunner.createIndex(
        'property_tour_engagements',
        new TableIndex({
          name: 'IDX_property_tour_engagements_property_id',
          columnNames: ['property_id'],
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasEngagementTable = await queryRunner.hasTable('property_tour_engagements');
    if (hasEngagementTable) {
      await queryRunner.dropTable('property_tour_engagements');
    }

    const hasVirtualTourColumn = await queryRunner.hasColumn(
      'properties',
      'virtual_tour_url',
    );
    if (hasVirtualTourColumn) {
      await queryRunner.dropColumn('properties', 'virtual_tour_url');
    }
  }
}
