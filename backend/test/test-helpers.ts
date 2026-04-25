import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

/**
 * Get TypeORM configuration for e2e tests using SQLite in-memory
 */
export function getTestDatabaseConfig(entities: any[]): TypeOrmModuleOptions {
  return {
    type: 'sqlite',
    database: ':memory:',
    entities,
    synchronize: true,
    dropSchema: false,
    logging: false,
  };
}

/**
 * Clear all tables in a database connection for test cleanup.
 * Essential for proper test isolation between test cases.
 */
export async function clearDatabase(dataSource: DataSource): Promise<void> {
  if (!dataSource || !dataSource.isInitialized) {
    return;
  }

  const queryRunner = dataSource.createQueryRunner();

  try {
    await queryRunner.connect();

    const tables = dataSource.entityMetadatas.map((e) => e.tableName);

    if (tables.length > 0) {
      if (dataSource.driver.options.type === 'postgres') {
        await queryRunner.query(
          `TRUNCATE TABLE ${tables.map((t) => `"${t}"`).join(', ')} CASCADE`,
        );
      } else if (
        dataSource.driver.options.type === 'mysql' ||
        dataSource.driver.options.type === 'mariadb'
      ) {
        await queryRunner.query('SET FOREIGN_KEY_CHECKS=0');
        for (const table of tables) {
          await queryRunner.query(`TRUNCATE TABLE \`${table}\``);
        }
        await queryRunner.query('SET FOREIGN_KEY_CHECKS=1');
      } else if (dataSource.driver.options.type === 'sqlite') {
        for (const table of tables) {
          await queryRunner.query(`DELETE FROM "${table}"`);
        }
      }
    }
  } finally {
    await queryRunner.release();
  }
}

/**
 * Clear specific repositories for more granular test cleanup
 */
export async function clearRepositories(
  repositories: Repository<any>[],
): Promise<void> {
  for (const repo of repositories) {
    if (repo) {
      try {
        await repo.delete({});
      } catch (e) {
        // Skip if delete fails (e.g., repo not initialized)
      }
    }
  }
}

/**
 * Wrapper to ensure database is clean before and after a test
 */
export async function cleanupDatabase(
  callback: () => Promise<void>,
  cleanup: () => Promise<void>,
): Promise<void> {
  try {
    await cleanup();
    await callback();
    await cleanup();
  } catch (e) {
    await cleanup().catch(() => {
      // Ignore cleanup errors if test already failed
    });
    throw e;
  }
}
