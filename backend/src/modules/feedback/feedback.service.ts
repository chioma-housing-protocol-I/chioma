import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback, FeedbackType } from './entities/feedback.entity';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(Feedback)
    private readonly feedbackRepo: Repository<Feedback>,
  ) {}

  async submit(
    dto: SubmitFeedbackDto,
    userId?: string,
  ): Promise<{ id: string }> {
    const feedback = this.feedbackRepo.create({
      email: dto.email ?? undefined,
      message: dto.message,
      type: dto.type ?? FeedbackType.GENERAL,
      userId: userId ?? undefined,
    });
    const saved = await this.feedbackRepo.save(feedback);
    return { id: saved.id };
  }
}
