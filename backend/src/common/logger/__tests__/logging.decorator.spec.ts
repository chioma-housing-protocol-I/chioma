import { Logging } from '../logging.decorator';
import { LoggerService } from '../logger.service';

jest.mock('../logger.service');

describe('@Logging() decorator', () => {
  beforeEach(() => {
    jest.spyOn(LoggerService.prototype, 'debug').mockImplementation(() => {});
    jest.spyOn(LoggerService.prototype, 'info').mockImplementation(() => {});
    jest.spyOn(LoggerService.prototype, 'error').mockImplementation(() => {});
    jest
      .spyOn(LoggerService.prototype, 'setContext')
      .mockImplementation(() => {});
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
    expect(LoggerService.prototype.debug).toHaveBeenCalledWith(
      'Entering successMethod',
      expect.any(Object),
    );
    expect(LoggerService.prototype.info).toHaveBeenCalledWith(
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

    expect(LoggerService.prototype.error).toHaveBeenCalledWith(
      'Error in errorMethod',
      new Error('fail'),
      expect.objectContaining({
        method: 'errorMethod',
        duration: expect.any(Number),
      }),
    );
  });
});
