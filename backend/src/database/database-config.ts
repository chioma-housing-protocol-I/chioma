import { DataSourceOptions } from 'typeorm';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

type DatabaseEnv = Record<string, string | undefined>;

interface ReplicationNodeConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl: false | { rejectUnauthorized: boolean };
}

function parseNumber(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildSslConfig(
  env: DatabaseEnv,
): false | { rejectUnauthorized: boolean } {
  if (env.DB_SSL !== 'true') {
    return false;
  }

  return {
    rejectUnauthorized: env.DB_SSL_REJECT_UNAUTHORIZED === 'true',
  };
}

function buildPrimaryNode(env: DatabaseEnv): ReplicationNodeConfig {
  return {
    host: env.DB_HOST || 'localhost',
    port: parseNumber(env.DB_PORT, 5432),
    username: env.DB_USERNAME || 'postgres',
    password: env.DB_PASSWORD || 'password',
    database: env.DB_NAME || 'chioma_db',
    ssl: buildSslConfig(env),
  };
}

export function hasReplicaDatabaseConfig(
  env: DatabaseEnv = process.env,
): boolean {
  return Boolean(
    env.DB_REPLICA_HOST &&
    env.DB_REPLICA_USERNAME &&
    env.DB_REPLICA_PASSWORD &&
    env.DB_REPLICA_NAME,
  );
}

export function buildReplicationConfig(
  env: DatabaseEnv = process.env,
): NonNullable<PostgresConnectionOptions['replication']> | undefined {
  if (env.DATABASE_URL || !hasReplicaDatabaseConfig(env)) {
    return undefined;
  }

  return {
    master: buildPrimaryNode(env),
    slaves: [
      {
        host: env.DB_REPLICA_HOST!,
        port: parseNumber(env.DB_REPLICA_PORT, 5432),
        username: env.DB_REPLICA_USERNAME!,
        password: env.DB_REPLICA_PASSWORD!,
        database: env.DB_REPLICA_NAME!,
        ssl: buildSslConfig(env),
      },
    ],
  };
}

export function createDatabaseConnectionOptions(
  rootDir: string,
  migrations: string[],
  env: DatabaseEnv = process.env,
): DataSourceOptions {
  const baseOptions: DataSourceOptions = {
    type: 'postgres',
    namingStrategy: new SnakeNamingStrategy(),
    entities: [`${rootDir}/modules/**/*.entity{.ts,.js}`],
    migrations,
    migrationsTableName: 'migrations',
    migrationsTransactionMode: 'each',
    synchronize: false,
    logging: env.TYPEORM_LOGGING === 'true',
    logger: 'advanced-console',
    extra: {
      max: parseNumber(env.DB_POOL_MAX, 20),
      min: parseNumber(env.DB_POOL_MIN, 5),
      idleTimeoutMillis: parseNumber(env.DB_POOL_IDLE_TIMEOUT, 30000),
      connectionTimeoutMillis: parseNumber(
        env.DB_POOL_CONNECTION_TIMEOUT,
        2000,
      ),
    },
  };

  if (env.DATABASE_URL) {
    return {
      ...baseOptions,
      url: env.DATABASE_URL,
    };
  }

  const replication = buildReplicationConfig(env);
  if (replication) {
    return {
      ...baseOptions,
      replication,
    };
  }

  return {
    ...baseOptions,
    host: env.DB_HOST,
    port: parseNumber(env.DB_PORT, 5432),
    username: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    ssl: buildSslConfig(env),
  };
}
