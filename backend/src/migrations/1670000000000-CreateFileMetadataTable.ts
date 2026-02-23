import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateFileMetadataTable1670000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'file_metadata',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'fileName', type: 'varchar' },
          { name: 'fileSize', type: 'int' },
          { name: 'fileType', type: 'varchar' },
          { name: 's3Key', type: 'varchar' },
          { name: 'ownerId', type: 'uuid' },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp', default: 'now()' },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('file_metadata');
  }
}
