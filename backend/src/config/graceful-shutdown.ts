import { INestApplication, Logger } from '@nestjs/common';

const DEFAULT_SHUTDOWN_TIMEOUT_MS = 30_000;

export interface GracefulShutdownOptions {
  /** Max time to wait for in-flight requests before forcing exit */
  timeoutMs?: number;
  logger?: Logger;
}

/**
 * Registers SIGTERM/SIGINT handlers for zero-downtime Kubernetes deploys.
 * Enables Nest lifecycle hooks so TypeORM, Bull, and other modules close cleanly.
 */
export function registerGracefulShutdown(
  app: INestApplication,
  options: GracefulShutdownOptions = {},
): (signal: string) => Promise<void> {
  const logger = options.logger ?? new Logger('GracefulShutdown');
  const timeoutMs = options.timeoutMs ?? DEFAULT_SHUTDOWN_TIMEOUT_MS;

  app.enableShutdownHooks();

  let shuttingDown = false;

  const shutdown = async (signal: string) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    logger.log(`Received ${signal}, starting graceful shutdown`);

    const forceExitTimer = setTimeout(() => {
      logger.error(`Shutdown timed out after ${timeoutMs}ms, forcing exit`);
      process.exit(1);
    }, timeoutMs);
    forceExitTimer.unref();

    try {
      await app.close();
      clearTimeout(forceExitTimer);
      logger.log('Application closed successfully');
      process.exit(0);
    } catch (error) {
      clearTimeout(forceExitTimer);
      logger.error('Error during graceful shutdown', error as Error);
      process.exit(1);
    }
  };

  process.once('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
  process.once('SIGINT', () => {
    void shutdown('SIGINT');
  });

  return shutdown;
}
