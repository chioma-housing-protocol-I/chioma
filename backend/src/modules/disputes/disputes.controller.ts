import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Headers,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DisputesService } from './disputes.service';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { UpdateDisputeDto } from './dto/update-dispute.dto';
import { AddEvidenceDto } from './dto/add-evidence.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { AddCommentDto } from './dto/add-comment.dto';
import { QueryDisputesDto } from './dto/query-disputes.dto';

@Controller('disputes')
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) { }

  /**
   * POST /api/disputes
   * Create a new dispute
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createDisputeDto: CreateDisputeDto,
    @Headers('x-user-id') userId: string,
  ) {
    return await this.disputesService.createDispute(createDisputeDto, userId);
  }

  /**
   * GET /api/disputes
   * List disputes with optional filters
   */
  @Get()
  async findAll(@Query() query: QueryDisputesDto, @Headers('x-user-id') userId: string) {
    return await this.disputesService.findAll(query, userId);
  }

  /**
   * GET /api/disputes/:id
   * Get dispute details
   */
  @Get(':id')
  async findOne(@Param('id') id: string, @Headers('x-user-id') userId: string) {
    // TODO: Extract userId from authenticated request
    return await this.disputesService.findOne(id, userId);
  }

  /**
   * PUT /api/disputes/:id
   * Update dispute
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDisputeDto: UpdateDisputeDto,
    @Headers('x-user-id') userId: string,
  ) {
    return await this.disputesService.update(id, updateDisputeDto, userId);
  }

  /**
   * POST /api/disputes/:id/evidence
   * Add evidence to dispute
   */
  @Post(':id/evidence')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  async addEvidence(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({
            fileType: /(image|application|video|text)\/(jpeg|png|gif|webp|pdf|msword|wordprocessingml|plain|mp4|quicktime)/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() addEvidenceDto: AddEvidenceDto,
    @Headers('x-user-id') userId: string,
  ) {
    return await this.disputesService.addEvidence(id, file, userId, addEvidenceDto);
  }

  /**
   * POST /api/disputes/:id/resolve
   * Resolve dispute
   */
  @Post(':id/resolve')
  async resolve(
    @Param('id') id: string,
    @Body() resolveDisputeDto: ResolveDisputeDto,
    @Headers('x-user-id') userId: string,
  ) {
    return await this.disputesService.resolveDispute(id, resolveDisputeDto, userId);
  }

  /**
   * POST /api/disputes/:id/comment
   * Add comment to dispute
   */
  @Post(':id/comment')
  @HttpCode(HttpStatus.CREATED)
  async addComment(
    @Param('id') id: string,
    @Body() addCommentDto: AddCommentDto,
    @Headers('x-user-id') userId: string,
  ) {
    return await this.disputesService.addComment(id, addCommentDto, userId);
  }

  /**
   * POST /api/disputes/:id/withdraw
   * Withdraw dispute
   */
  @Post(':id/withdraw')
  async withdraw(@Param('id') id: string, @Headers('x-user-id') userId: string) {
    return await this.disputesService.withdrawDispute(id, userId);
  }
}
