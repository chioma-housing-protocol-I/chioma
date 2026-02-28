import { TypeOrmModuleOptions } from '@nestjs/typeorm';

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
