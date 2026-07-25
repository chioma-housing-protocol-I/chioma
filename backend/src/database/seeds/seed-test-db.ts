import { AppDataSource } from '../data-source';
import { TestSeeder } from '../../../test/test-seeder';
import { createScriptLogger } from '../../common/services/script-logger';

const logger = createScriptLogger('seed-test-db');

async function runTestSeed() {
  if (
    process.env.NODE_ENV !== 'test' &&
    process.env.NODE_ENV !== 'development'
  ) {
    logger.error(
      'Test seeding should only be run in test or development environment',
    );
    process.exit(1);
  }

  logger.log(
    `Starting test database seeding in ${process.env.NODE_ENV} environment...`,
  );

  try {
    await AppDataSource.initialize();
    logger.log('Database connection initialized');

    const seeder = new TestSeeder(AppDataSource);
    await seeder.seedAll();

    logger.log('Test database seeding completed successfully');
    await AppDataSource.destroy();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Test seeding failed', {
      error: message,
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

void runTestSeed();
