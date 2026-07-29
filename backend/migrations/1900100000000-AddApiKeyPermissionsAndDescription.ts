import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddApiKeyPermissionsAndDescription1900100000000
    implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(
            'api_keys',
            new TableColumn({
                name: 'description',
                type: 'varchar',
                length: '255',
                isNullable: true,
                default: null,
            }),
        );

        await queryRunner.addColumn(
            'api_keys',
            new TableColumn({
                name: 'permissions',
                type: 'text',
                isNullable: false,
                default: "''",
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('api_keys', 'permissions');
        await queryRunner.dropColumn('api_keys', 'description');
    }
}
