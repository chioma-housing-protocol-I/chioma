/**
 * Data seeding service: single entry point for reference/data seeds.
 * Use for dev, test, and production. User seeds (admin/agent/tenant) remain
 * separate via seed:admin, seed:agent, seed:tenant.
 *
 * Usage:
 *   ts-node -r tsconfig-paths/register src/database/seed-runner.ts
 */

import { AppDataSource } from './data-source';
import { seedSupportedCurrencies } from './seeds/seed-currencies';
import { seedComprehensiveData } from './seeds/seed-comprehensive';
import { createScriptLogger } from '../common/services/script-logger';

const logger = createScriptLogger('seed-runner');

export async function runAllDataSeeds(): Promise<void> {
  await AppDataSource.initialize();
  try {
    await seedSupportedCurrencies(AppDataSource);
    await seedComprehensiveData(AppDataSource);
    logger.log('Data seeding completed.');
  } finally {
    await AppDataSource.destroy();
  }
}

if (require.main === module) {
  void runAllDataSeeds().catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Seeding failed', {
      error: message,
      stack: err?.stack,
    });
    process.exit(1);
  });
}
