import { parseCliArgs, seedAdminUser } from './admin.seed';
import { parseCliArgs as parseAgentArgs, seedAgentUser } from './agent.seed';
import { parseCliArgs as parseTenantArgs, seedTenantUser } from './tenant.seed';

type SupportedCommand = 'admin' | 'agent' | 'tenant';

function printUsage(): void {
  console.log('Usage: pnpm run seed:[command] -- [options]');
  console.log('');
  console.log('Commands:');
  console.log('  admin    Create admin user');
  console.log('  agent    Create agent user');
  console.log('  tenant   Create tenant user');
  console.log('');
  console.log('Options:');
  console.log('  --email <email>            User email');
  console.log('  --password <password>      User password');
  console.log('  --first-name <firstName>   User first name');
  console.log('  --last-name <lastName>     User last name');
  console.log('  --force                    Update existing user');
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

  console.error(`Unknown command: ${command}`);
  printUsage();
  process.exit(1);
}

void run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error('Command failed:', message);
  process.exit(1);
});
