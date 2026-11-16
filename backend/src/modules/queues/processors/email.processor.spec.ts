import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bull';
import { EmailQueueProcessor, EmailJobData } from './email.processor';
import { EmailService } from '../../notifications/email.service';

const makeJob = (data: EmailJobData): Job<EmailJobData> =>
  ({ id: '1', data }) as unknown as Job<EmailJobData>;

describe('EmailQueueProcessor', () => {
  let processor: EmailQueueProcessor;
  let emailService: jest.Mocked<
    Pick<
      EmailService,
      | 'sendVerificationEmail'
      | 'sendPasswordResetEmail'
      | 'sendNotificationEmail'
      | 'sendAlertEmail'
    >
  >;

  beforeEach(async () => {
    emailService = {
      sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
      sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
      sendNotificationEmail: jest.fn().mockResolvedValue(undefined),
      sendAlertEmail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailQueueProcessor,
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    processor = module.get(EmailQueueProcessor);
  });

  it('routes a booking-confirmation job through sendNotificationEmail (#2092)', async () => {
    await processor.handleEmailJob(
      makeJob({
        type: 'booking-confirmation',
        email: 'guest@example.com',
        subject: 'Your booking is confirmed',
        template: 'booking-confirmation',
        data: { title: 'Booking confirmed', message: 'See you soon' },
      }),
    );

    expect(emailService.sendNotificationEmail).toHaveBeenCalledWith(
      'guest@example.com',
      'Your booking is confirmed',
      'booking-confirmation',
      { title: 'Booking confirmed', message: 'See you soon' },
    );
  });

  it('propagates a booking-confirmation send failure so Bull retries the job', async () => {
    emailService.sendNotificationEmail.mockRejectedValueOnce(
      new Error('smtp down'),
    );

    await expect(
      processor.handleEmailJob(
        makeJob({
          type: 'booking-confirmation',
          email: 'guest@example.com',
        }),
      ),
    ).rejects.toThrow('smtp down');
  });

  it('still routes a plain notification job the same way as before', async () => {
    await processor.handleEmailJob(
      makeJob({
        type: 'notification',
        email: 'user@example.com',
        subject: 'Hello',
        template: 'default',
        data: {},
      }),
    );

    expect(emailService.sendNotificationEmail).toHaveBeenCalledWith(
      'user@example.com',
      'Hello',
      'default',
      {},
    );
  });

  it('throws for an unknown job type', async () => {
    await expect(
      processor.handleEmailJob(
        makeJob({ type: 'unknown' as never, email: 'x@example.com' }),
      ),
    ).rejects.toThrow('Unknown email type');
  });
});
