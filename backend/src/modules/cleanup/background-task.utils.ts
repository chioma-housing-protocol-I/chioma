import { Logger } from '@nestjs/common';
import { AlertService } from '../monitoring/alert.service';

export interface BackgroundTaskContext {
  task: string;
  [key: string]: unknown;
}

export function errorDetails(error: unknown): {
  message: string;
  stack?: string;
  name?: string;
} {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack, name: error.name };
  }
  return { message: String(error) };
}

export async function runBackgroundTask<T>(
  logger: Logger,
  context: BackgroundTaskContext,
  operation: () => Promise<T>,
  alertService?: AlertService,
): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error) {
    const details = errorDetails(error);
    logger.error(
      `Background task failed: ${context.task}`,
      details.stack ?? details.message,
      JSON.stringify({ ...context, error: details }),
    );

    if (alertService) {
      try {
        await alertService.handleAlert({
          alerts: [
            {
              status: 'firing',
              labels: {
                alertname: 'BackgroundTaskFailure',
                severity: 'critical',
                service: 'chioma-backend',
                task: context.task,
              },
              annotations: {
                summary: `Background task failed: ${context.task}`,
                description: details.message,
              },
              startsAt: new Date().toISOString(),
              generatorURL: '',
            },
          ],
        });
      } catch (alertError) {
        const alertDetails = errorDetails(alertError);
        logger.error(
          `Failed to dispatch background task failure alert: ${context.task}`,
          alertDetails.stack ?? alertDetails.message,
        );
      }
    }

    return undefined;
  }
}
