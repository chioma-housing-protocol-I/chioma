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

export async function runAllDataSeeds(): Promise<void> {
  await AppDataSource.initialize();
  try {
    await seedSupportedCurrencies(AppDataSource);
    console.log('Data seeding completed.');
  } finally {
    await AppDataSource.destroy();
  }
}

if (require.main === module) {
  void runAllDataSeeds().catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
}
