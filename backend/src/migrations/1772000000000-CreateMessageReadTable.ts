import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

export class CreateMessageReadTable1772000000000 implements MigrationInterface {
  name = 'CreateMessageReadTable1772000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create message_read table
    await queryRunner.createTable(
      new Table({
        name: 'message_read',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'userId',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'chatRoomId',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'readAt',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create unique index on userId + chatRoomId
    await queryRunner.createIndex(
      'message_read',
      new TableIndex({
        name: 'IDX_message_read_user_room',
        columnNames: ['userId', 'chatRoomId'],
        isUnique: true,
      }),
    );

    // Create index on userId for efficient per-user queries
    await queryRunner.createIndex(
      'message_read',
      new TableIndex({
        name: 'IDX_message_read_userId',
        columnNames: ['userId'],
      }),
    );

    // Add foreign key to chat_room
    await queryRunner.createForeignKey(
      'message_read',
      new TableForeignKey({
        columnNames: ['chatRoomId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'chat_room',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('message_read');
    if (table) {
      const foreignKey = table.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('chatRoomId') !== -1,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey('message_read', foreignKey);
      }
    }

    await queryRunner.dropIndex('message_read', 'IDX_message_read_userId');
    await queryRunner.dropIndex('message_read', 'IDX_message_read_user_room');
    await queryRunner.dropTable('message_read');
  }
}
