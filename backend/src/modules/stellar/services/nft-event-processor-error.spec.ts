import { Logger } from '@nestjs/common';
import { NftEventProcessor } from './nft-event-processor.service';

describe('NftEventProcessor error handling (#2180)', () => {
  const makeRepository = () => ({
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('catches a failed mint listener and logs the stack trace', async () => {
    const repository = makeRepository();
    repository.findOne.mockRejectedValue(new Error('db down'));
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const processor = new NftEventProcessor(repository as never);

    await expect(
      processor.handleObligationMinted({
        agreementId: 'agreement-1',
        admin: 'admin-1',
        mintedAt: 1_700_000_000,
        txHash: 'hash-1',
      }),
    ).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('obligation.minted'),
      expect.stringContaining('db down'),
    );
  });

  it('catches a failed transfer listener and logs the stack trace', async () => {
    const repository = makeRepository();
    repository.findOne.mockResolvedValue({ transferCount: 0 });
    repository.save.mockRejectedValue(new Error('save failed'));
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const processor = new NftEventProcessor(repository as never);

    await expect(
      processor.handleObligationTransferred({
        agreementId: 'agreement-1',
        from: 'a',
        to: 'b',
        txHash: 'hash-2',
      }),
    ).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('obligation.transferred'),
      expect.stringContaining('save failed'),
    );
  });
});
