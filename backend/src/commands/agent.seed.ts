import * as bcrypt from 'bcrypt';
import { AppDataSource } from '../database/data-source';
import {
  AuthMethod,
  User,
  UserRole,
} from '../modules/users/entities/user.entity';

const SALT_ROUNDS = 12;

interface SeedAgentOptions {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  force: boolean;
}

interface SeedAgentConfig {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  force: boolean;
  autoGeneratePassword: boolean;
}

function parseCliArgs(argv: string[]): SeedAgentOptions {
  const options: SeedAgentOptions = {
    force: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--force') {
      options.force = true;
      continue;
    }

    if (arg === '--email' && argv[index + 1]) {
      options.email = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--password' && argv[index + 1]) {
      options.password = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--first-name' && argv[index + 1]) {
      options.firstName = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--last-name' && argv[index + 1]) {
      options.lastName = argv[index + 1];
      index += 1;
    }
  }

  return options;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }

  return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
}

function generatePassword(length = 20): string {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghijkmnopqrstuvwxyz';
  const numbers = '23456789';
  const special = '@$!%*?&#^()_+=-{}[]:;<>.?/|~';

  const requiredChars = [
    uppercase[Math.floor(Math.random() * uppercase.length)],
    lowercase[Math.floor(Math.random() * lowercase.length)],
    numbers[Math.floor(Math.random() * numbers.length)],
    special[Math.floor(Math.random() * special.length)],
  ];

  const allChars = `${uppercase}${lowercase}${numbers}${special}`;
  const remainingLength = Math.max(0, length - requiredChars.length);

  for (let index = 0; index < remainingLength; index += 1) {
    const randomIndex = Math.floor(Math.random() * allChars.length);
    requiredChars.push(allChars[randomIndex]);
  }

  for (let index = requiredChars.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [requiredChars[index], requiredChars[swapIndex]] = [
      requiredChars[swapIndex],
      requiredChars[index],
    ];
  }

  return requiredChars.join('');
}

function validateEmail(email: string): void {
  const normalizedEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(normalizedEmail)) {
    throw new Error('Invalid agent email format');
  }
}

function validatePassword(password: string): void {
  if (password.length < 8 || password.length > 128) {
    throw new Error('Password must be between 8 and 128 characters');
  }

  if (!/[A-Z]/.test(password)) {
    throw new Error('Password must include at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    throw new Error('Password must include at least one lowercase letter');
  }

  if (!/\d/.test(password)) {
    throw new Error('Password must include at least one number');
  }

  if (!/[@$!%*?&#^()_+=\-{}[\]:;"'<>,.?/\\|`~]/.test(password)) {
    throw new Error('Password must include at least one special character');
  }
}

function getSeedConfig(options: SeedAgentOptions): SeedAgentConfig {
  const autoGeneratePassword = parseBoolean(
    process.env.AGENT_AUTO_GENERATE_PASSWORD,
    true,
  );

  return {
    email: (
      options.email ??
      process.env.AGENT_DEFAULT_EMAIL ??
      'agent@chioma.local'
    )
      .trim()
      .toLowerCase(),
    password: options.password,
    firstName:
      options.firstName ?? process.env.AGENT_DEFAULT_FIRST_NAME ?? 'Demo',
    lastName:
      options.lastName ?? process.env.AGENT_DEFAULT_LAST_NAME ?? 'Agent',
    force: options.force,
    autoGeneratePassword,
  };
}

export async function seedAgentUser(
  options: SeedAgentOptions = { force: false },
) {
  const config = getSeedConfig(options);
  validateEmail(config.email);

  let plainPassword = config.password;
  if (!plainPassword && config.autoGeneratePassword) {
    plainPassword = generatePassword();
  }

  if (!plainPassword) {
    throw new Error(
      'Agent password is required. Provide --password or set AGENT_AUTO_GENERATE_PASSWORD=true',
    );
  }

  validatePassword(plainPassword);

  await AppDataSource.initialize();

  try {
    const userRepository = AppDataSource.getRepository(User);

    const existingUser = await userRepository.findOne({
      where: { email: config.email },
    });

    const passwordHash = await bcrypt.hash(plainPassword, SALT_ROUNDS);

    if (existingUser) {
      if (!config.force) {
        console.log(
          `Agent seed skipped: user already exists for ${config.email}`,
        );
        console.log('Use --force to update the existing user.');
        return;
      }

      existingUser.firstName = config.firstName;
      existingUser.lastName = config.lastName;
      existingUser.password = passwordHash;
      existingUser.role = UserRole.AGENT;
      existingUser.emailVerified = true;
      existingUser.verificationToken = null;
      existingUser.resetToken = null;
      existingUser.resetTokenExpires = null;
      existingUser.failedLoginAttempts = 0;
      existingUser.accountLockedUntil = null;
      existingUser.isActive = true;
      existingUser.authMethod = AuthMethod.PASSWORD;

      await userRepository.save(existingUser);

      console.log(`Agent user updated: ${existingUser.email}`);
    } else {
      const agentUser = userRepository.create({
        email: config.email,
        password: passwordHash,
        firstName: config.firstName,
        lastName: config.lastName,
        role: UserRole.AGENT,
        emailVerified: true,
        verificationToken: null,
        resetToken: null,
        resetTokenExpires: null,
        failedLoginAttempts: 0,
        accountLockedUntil: null,
        isActive: true,
        authMethod: AuthMethod.PASSWORD,
        refreshToken: null,
      });

      const savedAgent = await userRepository.save(agentUser);
      console.log(`Agent user created: ${savedAgent.email}`);
    }

    const passwordSource = config.password ? 'provided' : 'generated';
    console.log(`Agent password (${passwordSource}): ${plainPassword}`);
    console.log('Agent seeding completed successfully.');
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

if (require.main === module) {
  const options = parseCliArgs(process.argv.slice(2));

  void seedAgentUser(options)
    .then(() => {
      process.exit(0);
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Agent seeding failed:', message);
      process.exit(1);
    });
}

export { parseCliArgs };
