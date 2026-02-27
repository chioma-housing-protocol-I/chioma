import { Body, Controller, Post, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FeedbackService } from './feedback.service';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';

@ApiTags('Community & Support')
@Controller('api/feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @ApiOperation({
    summary: 'Submit feedback',
    description:
      'Submit bug reports, feature requests, or general feedback. Optional auth to associate with your account.',
  })
  @ApiResponse({
    status: 201,
    description: 'Feedback submitted',
    schema: { type: 'object', properties: { id: { type: 'string' } } },
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async submit(
    @Body() dto: SubmitFeedbackDto,
    @Req() req: { user?: { id: string } },
  ) {
    return this.feedbackService.submit(dto, req.user?.id);
  }
}
