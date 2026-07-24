import 'reflect-metadata';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import * as dotenv from 'dotenv';

dotenv.config();

/** e.g. .../src or .../dist/src */
const rootDir = path.join(__dirname, '..');
/** repo backend root (holds extra migrations not under src/) */
const backendRootDir = path.join(rootDir, '..');

/**
 * TypeORM CLI DataSource (migrations:generate / run / revert / show).
 * - Development: run from repo root with ts-node (`src/database/data-source.ts`).
 * - Production: use compiled file (`dist/src/database/data-source.js`) after `pnpm run build`.
 *
 * Connection: prefer `DATABASE_URL` when set; otherwise `DB_HOST`, `DB_PORT`, etc.
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL || undefined,
  host: process.env.DATABASE_URL
    ? undefined
    : process.env.DB_HOST || 'localhost',
  port: process.env.DATABASE_URL
    ? undefined
    : parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DATABASE_URL
    ? undefined
    : process.env.DB_USERNAME || 'postgres',
  password: process.env.DATABASE_URL
    ? undefined
    : process.env.DB_PASSWORD || 'password',
  database: process.env.DATABASE_URL
    ? undefined
    : process.env.DB_NAME || 'chioma_db',
  ssl:
    process.env.DB_SSL === 'true'
      ? {
          rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true',
        }
      : false,
  namingStrategy: new SnakeNamingStrategy(),
  entities: [path.join(rootDir, 'modules', '**', '*.entity{.ts,.js}')],
  migrations: [
    path.join(rootDir, 'migrations', '*{.ts,.js}'),
    path.join(backendRootDir, 'migrations', '*{.ts,.js}'),
  ],
  migrationsTableName: 'migrations',
  migrationsTransactionMode: 'each',
  synchronize: false,
  logging: false, // Disable query logging to prevent credential exposure in debug output
});
