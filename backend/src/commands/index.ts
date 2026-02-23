import { parseCliArgs, seedAdminUser } from './admin.seed';

type SupportedCommand = 'admin';

function printUsage(): void {
  console.log('Usage: pnpm run seed:admin -- [options]');
  console.log('');
  console.log('Options:');
  console.log('  --email <email>            Admin email');
  console.log('  --password <password>      Admin password');
  console.log('  --first-name <firstName>   Admin first name');
  console.log('  --last-name <lastName>     Admin last name');
  console.log('  --force                    Update existing admin user');
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

  console.error(`Unknown command: ${command}`);
  printUsage();
  process.exit(1);
}

void run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error('Command failed:', message);
  process.exit(1);
});
