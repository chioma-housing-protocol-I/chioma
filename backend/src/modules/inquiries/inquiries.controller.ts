import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { InquiriesService } from './inquiries.service';
import { CreatePropertyInquiryDto } from './dto/create-property-inquiry.dto';

@ApiTags('Inquiries')
@Controller('inquiries')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class InquiriesController {
  constructor(private readonly inquiriesService: InquiriesService) {}

  @Post()
  @ApiOperation({ summary: 'Create property inquiry' })
  @ApiResponse({ status: 201, description: 'Inquiry created successfully' })
  async create(
    @CurrentUser() user: User,
    @Body() dto: CreatePropertyInquiryDto,
  ) {
    return this.inquiriesService.createInquiry(user.id, dto);
  }

  @Get('incoming')
  @ApiOperation({ summary: 'List inquiries sent to current user properties' })
  async incoming(@CurrentUser() user: User) {
    return this.inquiriesService.listIncoming(user.id);
  }

  @Get('outgoing')
  @ApiOperation({ summary: 'List inquiries created by current user' })
  async outgoing(@CurrentUser() user: User) {
    return this.inquiriesService.listOutgoing(user.id);
  }

  @Patch(':id/viewed')
  @ApiOperation({ summary: 'Mark an incoming inquiry as viewed' })
  async markViewed(@Param('id') id: string, @CurrentUser() user: User) {
    return this.inquiriesService.markViewed(id, user.id);
  }

  @Patch(':id/close')
  @ApiOperation({ summary: 'Close an inquiry (sender or recipient)' })
  @ApiResponse({ status: 400, description: 'Invalid lifecycle transition' })
  async close(@Param('id') id: string, @CurrentUser() user: User) {
    return this.inquiriesService.close(id, user.id);
  }
}
