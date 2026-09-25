import { INestApplication, Logger } from '@nestjs/common';
import { registerGracefulShutdown } from './graceful-shutdown';

describe('registerGracefulShutdown', () => {
  const originalListeners = {
    SIGTERM: process.listeners('SIGTERM'),
    SIGINT: process.listeners('SIGINT'),
  };

  afterEach(() => {
    process.removeAllListeners('SIGTERM');
    process.removeAllListeners('SIGINT');
    for (const listener of originalListeners.SIGTERM) {
      process.on('SIGTERM', listener);
    }
    for (const listener of originalListeners.SIGINT) {
      process.on('SIGINT', listener);
    }
  });

  it('enables shutdown hooks and registers signal handlers', async () => {
    const close = jest.fn().mockResolvedValue(undefined);
    const enableShutdownHooks = jest.fn();
    const app = {
      close,
      enableShutdownHooks,
    } as unknown as INestApplication;

    const exitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation((() => undefined) as typeof process.exit);

    const shutdown = registerGracefulShutdown(app, {
      logger: new Logger('TestShutdown'),
    });

    expect(enableShutdownHooks).toHaveBeenCalled();
    expect(process.listeners('SIGTERM').length).toBeGreaterThan(0);

    await shutdown('SIGTERM');

    expect(close).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);

    exitSpy.mockRestore();
  });
});
