import { Logger } from '@nestjs/common';
import { Logging } from '../logging.decorator';

describe('@Logging() decorator', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  class TestClass {
    @Logging()
    async successMethod(arg: string) {
      return `hello ${arg}`;
    }

    @Logging()
    async errorMethod() {
      throw new Error('fail');
    }
  }

  it('should log entry and exit on success', async () => {
    const instance = new TestClass();
    const result = await instance.successMethod('world');

    expect(result).toBe('hello world');
    expect(Logger.prototype.debug).toHaveBeenCalledWith(
      'Entering successMethod',
      expect.any(Object),
    );
    expect(Logger.prototype.log).toHaveBeenCalledWith(
      'Exiting successMethod',
      expect.objectContaining({
        method: 'successMethod',
        duration: expect.any(Number),
      }),
    );
  });

  it('should log error on failure', async () => {
    const instance = new TestClass();
    await expect(instance.errorMethod()).rejects.toThrow('fail');

    expect(Logger.prototype.error).toHaveBeenCalledWith(
      'Error in errorMethod',
      expect.stringContaining('fail'),
      expect.objectContaining({
        method: 'errorMethod',
        duration: expect.any(Number),
      }),
    );
  });
});
