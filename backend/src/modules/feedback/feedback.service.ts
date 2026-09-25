import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { Feedback, FeedbackType } from './entities/feedback.entity';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';

const URL_PATTERN = /https?:\/\/\S+/gi;

@Injectable()
export class FeedbackService {
  // Configurable via env; defaults keep honest users unaffected while
  // blunting scripted submissions.
  private readonly maxLinks: number;
  private readonly maxPerHour: number;
  private readonly duplicateWindowHours: number;

  constructor(
    @InjectRepository(Feedback)
    private readonly feedbackRepo: Repository<Feedback>,
    private readonly configService: ConfigService,
  ) {
    this.maxLinks = this.configService.get<number>('FEEDBACK_MAX_LINKS', 3);
    this.maxPerHour = this.configService.get<number>(
      'FEEDBACK_MAX_PER_HOUR',
      5,
    );
    this.duplicateWindowHours = this.configService.get<number>(
      'FEEDBACK_DUPLICATE_WINDOW_HOURS',
      24,
    );
  }

  async submit(
    dto: SubmitFeedbackDto,
    userId?: string,
  ): Promise<{ id: string }> {
    this.assertNotSpammy(dto.message);
    await this.assertWithinSubmissionLimits(dto, userId);

    const feedback = this.feedbackRepo.create({
      email: dto.email ?? undefined,
      message: dto.message,
      type: dto.type ?? FeedbackType.GENERAL,
      userId: userId ?? undefined,
    });
    const saved = await this.feedbackRepo.save(feedback);
    return { id: saved.id };
  }

  /**
   * Content heuristics for automated submissions. IP/user request throttling
   * is handled by RateLimitGuard on the controller; these checks target the
   * content itself.
   */
  private assertNotSpammy(message: string): void {
    const links = message.match(URL_PATTERN) ?? [];
    if (links.length > this.maxLinks) {
      throw new BadRequestException(
        `Feedback may contain at most ${this.maxLinks} links`,
      );
    }
  }

  /**
   * Persistence-level throttle keyed on the submitter identity we can
   * attribute (user id for authenticated users, email otherwise). Rejects
   * duplicate messages inside the configured window and caps submissions
   * per hour. Anonymous submissions without an email are covered only by
   * the per-IP guard throttle.
   */
  private async assertWithinSubmissionLimits(
    dto: SubmitFeedbackDto,
    userId?: string,
  ): Promise<void> {
    const identityWhere = userId
      ? { userId }
      : dto.email
        ? { email: dto.email }
        : null;
    if (!identityWhere) return;

    const duplicateSince = new Date(
      Date.now() - this.duplicateWindowHours * 60 * 60 * 1000,
    );
    const duplicate = await this.feedbackRepo.findOne({
      where: {
        ...identityWhere,
        message: dto.message,
        createdAt: MoreThan(duplicateSince),
      },
    });
    if (duplicate) {
      throw new BadRequestException(
        'This feedback was already submitted recently',
      );
    }

    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await this.feedbackRepo.count({
      where: { ...identityWhere, createdAt: MoreThan(hourAgo) },
    });
    if (recentCount >= this.maxPerHour) {
      throw new BadRequestException(
        'Feedback submission limit reached, please try again later',
      );
    }
  }
}
