import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddIpfsCidToProfileMetadata1769280100000 implements MigrationInterface {
  name = 'AddIpfsCidToProfileMetadata1769280100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'profile_metadata',
      new TableColumn({
        name: 'ipfs_cid',
        type: 'varchar',
        length: '100',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('profile_metadata', 'ipfs_cid');
  }
}
