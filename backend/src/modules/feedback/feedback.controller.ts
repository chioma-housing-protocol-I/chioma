import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FeedbackService } from './feedback.service';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';
import {
  EndpointCategory,
  RateLimitCategory,
  RateLimitGuard,
  RateLimitPoints,
} from '../rate-limiting';

@ApiTags('Community & Support')
@Controller('feedback')
@UseGuards(RateLimitGuard)
@RateLimitCategory(EndpointCategory.PUBLIC)
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  // Submissions are writes from an (often) unauthenticated surface, so each
  // one costs several points of the caller's public-tier budget. Keyed per
  // user when authenticated, per client IP otherwise.
  @RateLimitPoints(5)
  @ApiOperation({
    summary: 'Submit feedback',
    description:
      'Submit bug reports, feature requests, or general feedback. Optional auth to associate with your account. Rate limited per user/IP.',
  })
  @ApiResponse({
    status: 201,
    description: 'Feedback submitted',
    schema: { type: 'object', properties: { id: { type: 'string' } } },
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async submit(
    @Body() dto: SubmitFeedbackDto,
    @Req() req: { user?: { id: string } },
  ) {
    return this.feedbackService.submit(dto, req.user?.id);
  }
}
