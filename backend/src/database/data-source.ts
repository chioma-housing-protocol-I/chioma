import 'reflect-metadata';
import * as path from 'path';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { createDatabaseConnectionOptions } from './database-config';

// Mirror AppModule's ConfigModule.forRoot({ envFilePath: [`.env.${NODE_ENV}`, '.env'] })
// so migrations/seeds always target the same database as the running server.
dotenv.config({
  path: [`.env.${process.env.NODE_ENV || 'development'}`, '.env'],
});

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
export const AppDataSource = new DataSource(
  createDatabaseConnectionOptions(rootDir, [
    path.join(rootDir, 'migrations', '*{.ts,.js}'),
    path.join(backendRootDir, 'migrations', '*{.ts,.js}'),
  ]),
);
