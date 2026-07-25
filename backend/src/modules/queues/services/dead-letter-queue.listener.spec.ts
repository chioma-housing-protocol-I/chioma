import { Test, TestingModule } from '@nestjs/testing';
import { DeadLetterQueueListener } from '../listeners/dead-letter-queue.listener';
import { DeadLetterQueueService } from './dead-letter-queue.service';

describe('DeadLetterQueueListener', () => {
  let listener: DeadLetterQueueListener;
  let deadLetterQueueService: jest.Mocked<
    Pick<DeadLetterQueueService, 'shouldMoveToDeadLetter' | 'moveToDeadLetter'>
  >;

  beforeEach(async () => {
    deadLetterQueueService = {
      shouldMoveToDeadLetter: jest.fn(),
      moveToDeadLetter: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeadLetterQueueListener,
        {
          provide: DeadLetterQueueService,
          useValue: deadLetterQueueService,
        },
      ],
    }).compile();

    listener = module.get(DeadLetterQueueListener);
  });

  it('moves exhausted email jobs to the dead letter queue', async () => {
    const job = { id: '1', attemptsMade: 3, opts: { attempts: 3 } };
    deadLetterQueueService.shouldMoveToDeadLetter.mockReturnValue(true);

    await listener.onEmailFailed(job as any, new Error('smtp down'));

    expect(deadLetterQueueService.moveToDeadLetter).toHaveBeenCalledWith(
      'email',
      job,
      expect.any(Error),
    );
  });

  it('does not move jobs that will retry', async () => {
    const job = { id: '2', attemptsMade: 1, opts: { attempts: 3 } };
    deadLetterQueueService.shouldMoveToDeadLetter.mockReturnValue(false);

    await listener.onEmailFailed(job as any, new Error('temporary'));

    expect(deadLetterQueueService.moveToDeadLetter).not.toHaveBeenCalled();
  });
});
