import { Logger } from '@nestjs/common';
import { AgreementsEventListener } from './agreement-event-listener';
import { AgreementStatusChangedEvent } from '../events/agreement-status-changed.event';

describe('AgreementsEventListener error handling (#2180)', () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('swallows and logs listener failures instead of rejecting', async () => {
    const listener = new AgreementsEventListener();
    const event = new AgreementStatusChangedEvent(
      'agreement-1',
      'active',
      'terminated',
    );

    // Simulate a failure inside the listener body. EventEmitter2 does not
    // await listeners, so an escaping throw would become an unhandled error.
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {
      throw new Error('listener boom');
    });

    await expect(listener.handleStatusChanged(event)).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('agreement.status.changed'),
      expect.stringContaining('listener boom'),
    );
  });
});
