import { FeedbackService } from './feedback.service';
import { FeedbackType } from './entities/feedback.entity';

describe('FeedbackService', () => {
  const feedbackRepo = {
    create: jest.fn(),
    save: jest.fn(),
  };

  let service: FeedbackService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FeedbackService(feedbackRepo as never);
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
});
