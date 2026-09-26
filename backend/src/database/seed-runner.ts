/**
 * Data seeding service: single entry point for reference/data seeds.
 * Use for dev, test, and production. User seeds (admin/agent/tenant) remain
 * separate via seed:admin, seed:agent, seed:tenant.
 *
 * Usage:
 *   ts-node -r tsconfig-paths/register src/database/seed-runner.ts
 *   pnpm seed -- --scenario=lease,escrow,screening   (or --scenario=all)
 *   pnpm seed -- --list-scenarios
 */

import { AppDataSource } from './data-source';
import { seedSupportedCurrencies } from './seeds/seed-currencies';
import { seedComprehensiveData } from './seeds/seed-comprehensive';
import {
  resolveScenarioNames,
  SEED_SCENARIOS,
  seedScenarios,
} from './seeds/seed-scenarios';
import { createScriptLogger } from '../common/services/script-logger';

const logger = createScriptLogger('seed-runner');

function getScenarioArg(argv: string[]): string | undefined {
  const idx = argv.findIndex((a) => a.startsWith('--scenario'));
  if (idx === -1) return undefined;
  const [, value] = argv[idx].split('=');
  return value ?? argv[idx + 1] ?? '';
}

export async function runAllDataSeeds(
  argv: string[] = process.argv.slice(2),
): Promise<void> {
  if (argv.includes('--list-scenarios')) {
    for (const [name, { description }] of Object.entries(SEED_SCENARIOS)) {
      logger.log(`${name}: ${description}`);
    }
    return;
  }
  const scenarioArg = getScenarioArg(argv);
  const scenarios =
    scenarioArg === undefined ? [] : resolveScenarioNames(scenarioArg);

  await AppDataSource.initialize();
  try {
    await seedSupportedCurrencies(AppDataSource);
    await seedComprehensiveData(AppDataSource);
    if (scenarios.length) {
      await seedScenarios(AppDataSource, scenarios);
    }
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
