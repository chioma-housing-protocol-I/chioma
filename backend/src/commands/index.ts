import { Logger } from '@nestjs/common';
import { parseCliArgs, seedAdminUser } from './admin.seed';
import { parseCliArgs as parseAgentArgs, seedAgentUser } from './agent.seed';
import { parseCliArgs as parseTenantArgs, seedTenantUser } from './tenant.seed';
import {
  parseCliArgs as parseLandlordArgs,
  seedLandlordUser,
} from './landlord.seed';

type SupportedCommand = 'admin' | 'agent' | 'tenant' | 'landlord';
const logger = new Logger('SeedCommand');

function printUsage(): void {
  logger.log('Usage: pnpm run seed:[command] -- [options]');
  logger.log('');
  logger.log('Commands:');
  logger.log('  admin      Create admin user');
  logger.log('  agent      Create agent user');
  logger.log('  tenant     Create tenant user');
  logger.log('  landlord   Create landlord user');
  logger.log('');
  logger.log('Options:');
  logger.log('  --email <email>            User email');
  logger.log('  --password <password>      User password');
  logger.log('  --first-name <firstName>   User first name');
  logger.log('  --last-name <lastName>     User last name');
  logger.log('  --force                    Update existing user');
}

async function run(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);

  if (!command) {
    printUsage();
    process.exit(1);
  }

  const normalizedCommand = command.toLowerCase() as SupportedCommand;

  if (normalizedCommand === 'admin') {
    const options = parseCliArgs(args);
    await seedAdminUser(options);
    return;
  }

  if (normalizedCommand === 'agent') {
    const options = parseAgentArgs(args);
    await seedAgentUser(options);
    return;
  }

  if (normalizedCommand === 'tenant') {
    const options = parseTenantArgs(args);
    await seedTenantUser(options);
    return;
  }

  if (normalizedCommand === 'landlord') {
    const options = parseLandlordArgs(args);
    await seedLandlordUser(options);
    return;
  }

  logger.error(`Unknown command: ${command}`);
  printUsage();
  process.exit(1);
}

void run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  logger.error('Command failed:', message);
  process.exit(1);
});
