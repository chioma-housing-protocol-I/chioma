import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Request,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FeedbackService } from './feedback.service';
import {
  QueryFeedbackDto,
  UpdateFeedbackStatusDto,
} from './dto/query-feedback.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { IpAccessControlGuard } from '../auth/guards/ip-access-control.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { AuditLogInterceptor } from '../audit/interceptors/audit-log.interceptor';

@ApiTags('Admin Feedback')
@ApiBearerAuth('JWT-auth')
@Controller('admin/feedback')
@UseGuards(IpAccessControlGuard, JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@UseInterceptors(AuditLogInterceptor)
export class AdminFeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Get()
  @ApiOperation({ summary: 'List feedback with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Paginated feedback' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async list(@Query() query: QueryFeedbackDto) {
    return this.feedbackService.findAllForAdmin(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get feedback detail' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.feedbackService.findOneForAdmin(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update feedback triage status' })
  @ApiResponse({ status: 200, description: 'Feedback updated' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFeedbackStatusDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.feedbackService.updateStatus(id, dto.status, req.user.id);
  }
}
