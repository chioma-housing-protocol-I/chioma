import {
    MigrationInterface,
    QueryRunner,
    Table,
    TableIndex,
    TableForeignKey,
} from 'typeorm';

export class CreateFavoritesTable1920000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'favorites',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'user_id',
                        type: 'uuid',
                    },
                    {
                        name: 'property_id',
                        type: 'uuid',
                    },
                    {
                        name: 'created_at',
                        type: 'timestamp',
                        default: 'now()',
                    },
                ],
            }),
            true,
        );

        // Create unique constraint on user_id + property_id
        await queryRunner.createIndex(
            'favorites',
            new TableIndex({
                name: 'unique_user_property',
                columnNames: ['user_id', 'property_id'],
                isUnique: true,
            }),
        );

        // Create indexes for queries
        await queryRunner.createIndex(
            'favorites',
            new TableIndex({
                name: 'idx_user_id',
                columnNames: ['user_id'],
            }),
        );

        await queryRunner.createIndex(
            'favorites',
            new TableIndex({
                name: 'idx_property_id',
                columnNames: ['property_id'],
            }),
        );

        // Add foreign keys
        await queryRunner.createForeignKey(
            'favorites',
            new TableForeignKey({
                columnNames: ['user_id'],
                referencedColumnNames: ['id'],
                referencedTableName: 'users',
                onDelete: 'CASCADE',
            }),
        );

        await queryRunner.createForeignKey(
            'favorites',
            new TableForeignKey({
                columnNames: ['property_id'],
                referencedColumnNames: ['id'],
                referencedTableName: 'properties',
                onDelete: 'CASCADE',
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('favorites');
    }
}
