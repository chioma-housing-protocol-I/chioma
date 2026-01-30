import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UploadedFile,
  UseInterceptors,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DisputesService } from './disputes.service';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { UpdateDisputeDto } from './dto/update-dispute.dto';
import { AddEvidenceDto } from './dto/add-evidence.dto';
import { AddCommentDto } from './dto/add-comment.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { QueryDisputesDto } from './dto/query-disputes.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('disputes')
@UseGuards(JwtAuthGuard)
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createDispute(
    @Body() createDisputeDto: CreateDisputeDto,
    @Request() req,
  ) {
    return this.disputesService.createDispute(createDisputeDto, req.user.id);
  }

  @Get()
  async findAll(@Query() query: QueryDisputesDto, @Request() req) {
    return this.disputesService.findAll(query, req.user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.disputesService.findOne(parseInt(id));
  }

  @Get('dispute/:disputeId')
  async findByDisputeId(@Param('disputeId') disputeId: string) {
    return this.disputesService.findByDisputeId(disputeId);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDisputeDto: UpdateDisputeDto,
    @Request() req,
  ) {
    return this.disputesService.update(
      parseInt(id),
      updateDisputeDto,
      req.user.id,
    );
  }

  @Post(':disputeId/evidence')
  @UseInterceptors(FileInterceptor('file'))
  async addEvidence(
    @Param('disputeId') disputeId: string,
    @UploadedFile() file: any,
    @Body() dto: AddEvidenceDto,
    @Request() req,
  ) {
    return this.disputesService.addEvidence(disputeId, file, req.user.id, dto);
  }

  @Post(':disputeId/comment')
  async addComment(
    @Param('disputeId') disputeId: string,
    @Body() addCommentDto: AddCommentDto,
    @Request() req,
  ) {
    return this.disputesService.addComment(
      disputeId,
      addCommentDto,
      req.user.id,
    );
  }

  @Post(':disputeId/resolve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async resolveDispute(
    @Param('disputeId') disputeId: string,
    @Body() resolveDisputeDto: ResolveDisputeDto,
    @Request() req,
  ) {
    return this.disputesService.resolveDispute(
      disputeId,
      resolveDisputeDto,
      req.user.id,
    );
  }

  @Get('agreement/:agreementId/disputes')
  async getAgreementDisputes(
    @Param('agreementId') agreementId: string,
    @Request() req,
  ) {
    return this.disputesService.getAgreementDisputes(agreementId, req.user.id);
  }
}
