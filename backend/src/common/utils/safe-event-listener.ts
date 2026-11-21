import { Logger } from '@nestjs/common';

/**
 * Wraps an event listener so a failing handler can never produce an
 * unhandled error or a rejected promise. `@nestjs/event-emitter` does not
 * await listeners, so an exception escaping a listener is reported outside
 * the request lifecycle and can crash the process. Sync throws and rejected
 * promises are both funnelled into the logger with their stack trace.
 */
export function safeEventListener<TEvent, TResult>(
  listenerName: string,
  listener: (event: TEvent) => TResult | Promise<TResult>,
  logger: Logger = new Logger(listenerName),
): (event: TEvent) => Promise<TResult | undefined> {
  return async (event: TEvent): Promise<TResult | undefined> => {
    try {
      return await listener(event);
    } catch (error) {
      const details =
        error instanceof Error ? (error.stack ?? error.message) : String(error);
      logger.error(`Event listener ${listenerName} failed`, details);
      return undefined;
    }
  };
}
