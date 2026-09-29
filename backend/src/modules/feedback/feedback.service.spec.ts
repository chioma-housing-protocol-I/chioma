import { BadRequestException } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { FeedbackType } from './entities/feedback.entity';

describe('FeedbackService', () => {
  const feedbackRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
  };

  const configService = {
    get: jest.fn((_key: string, defaultValue: unknown) => defaultValue),
  };

  let service: FeedbackService;

  beforeEach(() => {
    jest.clearAllMocks();
    feedbackRepo.findOne.mockResolvedValue(null);
    feedbackRepo.count.mockResolvedValue(0);
    service = new FeedbackService(
      feedbackRepo as never,
      configService as never,
    );
  });

  it('submits general feedback by default', async () => {
    const feedback = {
      message: 'The property onboarding flow is clear.',
      type: FeedbackType.GENERAL,
      email: undefined,
      userId: undefined,
    };
    feedbackRepo.create.mockReturnValue(feedback);
    feedbackRepo.save.mockResolvedValue({ id: 'feedback-1', ...feedback });

    await expect(
      service.submit({ message: 'The property onboarding flow is clear.' }),
    ).resolves.toEqual({ id: 'feedback-1' });

    expect(feedbackRepo.create).toHaveBeenCalledWith(feedback);
    expect(feedbackRepo.save).toHaveBeenCalledWith(feedback);
  });

  it('persists optional email, type, and authenticated user id', async () => {
    const dto = {
      email: 'tenant@example.com',
      message: 'Please add saved property alerts.',
      type: FeedbackType.FEATURE,
    };
    const feedback = { ...dto, userId: 'user-1' };
    feedbackRepo.create.mockReturnValue(feedback);
    feedbackRepo.save.mockResolvedValue({ id: 'feedback-2', ...feedback });

    await expect(service.submit(dto, 'user-1')).resolves.toEqual({
      id: 'feedback-2',
    });

    expect(feedbackRepo.create).toHaveBeenCalledWith(feedback);
  });

  it('normalizes absent optional values to undefined before persistence', async () => {
    feedbackRepo.create.mockImplementation((value) => value);
    feedbackRepo.save.mockResolvedValue({ id: 'feedback-3' });

    await service.submit({
      email: undefined,
      message: 'Support message with enough characters.',
      type: undefined,
    });

    expect(feedbackRepo.create).toHaveBeenCalledWith({
      email: undefined,
      message: 'Support message with enough characters.',
      type: FeedbackType.GENERAL,
      userId: undefined,
    });
  });

  it('propagates repository save failures', async () => {
    const error = new Error('database unavailable');
    feedbackRepo.create.mockReturnValue({
      message: 'Bug report with enough detail.',
      type: FeedbackType.BUG,
    });
    feedbackRepo.save.mockRejectedValue(error);

    await expect(
      service.submit({
        message: 'Bug report with enough detail.',
        type: FeedbackType.BUG,
      }),
    ).rejects.toThrow(error);
  });

  describe('spam protection', () => {
    it('rejects messages with more links than the configured maximum', async () => {
      const spam =
        'Check https://a.example https://b.example https://c.example https://d.example now';

      await expect(service.submit({ message: spam })).rejects.toThrow(
        BadRequestException,
      );
      expect(feedbackRepo.save).not.toHaveBeenCalled();
    });

    it('allows messages at the link limit', async () => {
      feedbackRepo.create.mockImplementation((value) => value);
      feedbackRepo.save.mockResolvedValue({ id: 'feedback-4' });

      await expect(
        service.submit({
          message:
            'See https://a.example https://b.example https://c.example for context',
        }),
      ).resolves.toEqual({ id: 'feedback-4' });
    });

    it('rejects a duplicate message from the same user inside the window', async () => {
      feedbackRepo.findOne.mockResolvedValue({ id: 'existing' });

      await expect(
        service.submit(
          { message: 'Same message as before, resent.' },
          'user-1',
        ),
      ).rejects.toThrow('already submitted');
      expect(feedbackRepo.save).not.toHaveBeenCalled();
    });

    it('rejects when the hourly submission cap is reached', async () => {
      feedbackRepo.count.mockResolvedValue(5);

      await expect(
        service.submit(
          { message: 'Another perfectly valid feedback message.' },
          'user-1',
        ),
      ).rejects.toThrow('limit reached');
      expect(feedbackRepo.save).not.toHaveBeenCalled();
    });

    it('keys anonymous throttling on the provided email', async () => {
      feedbackRepo.count.mockResolvedValue(5);

      await expect(
        service.submit({
          email: 'burst@example.com',
          message: 'Anonymous but attributable submission.',
        }),
      ).rejects.toThrow('limit reached');
    });

    it('skips persistence throttling for anonymous submissions without email', async () => {
      feedbackRepo.create.mockImplementation((value) => value);
      feedbackRepo.save.mockResolvedValue({ id: 'feedback-5' });

      await expect(
        service.submit({ message: 'Anonymous feedback with no identity.' }),
      ).resolves.toEqual({ id: 'feedback-5' });
      expect(feedbackRepo.findOne).not.toHaveBeenCalled();
      expect(feedbackRepo.count).not.toHaveBeenCalled();
    });

    it('reads limits from configuration', () => {
      expect(configService.get).toHaveBeenCalledWith('FEEDBACK_MAX_LINKS', 3);
      expect(configService.get).toHaveBeenCalledWith(
        'FEEDBACK_MAX_PER_HOUR',
        5,
      );
      expect(configService.get).toHaveBeenCalledWith(
        'FEEDBACK_DUPLICATE_WINDOW_HOURS',
        24,
      );
    });
  });
});
