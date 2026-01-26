import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete,
  Body, 
  Param, 
  Query,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { AgreementsService } from './agreements.service';
import { CreateAgreementDto } from './dto/create-agreement.dto';
import { UpdateAgreementDto } from './dto/update-agreement.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { TerminateAgreementDto } from './dto/terminate-agreement.dto';
import { QueryAgreementsDto } from './dto/query-agreements.dto';
import { DisputesService } from '../disputes/disputes.service';

@Controller('api/agreements')
export class AgreementsController {
  constructor(
    private readonly agreementsService: AgreementsService,
    private readonly disputesService: DisputesService,
  ) {}

  /**
   * POST /api/agreements
   * Create a new rent agreement
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createAgreementDto: CreateAgreementDto) {
    return await this.agreementsService.create(createAgreementDto);
  }

  /**
   * GET /api/agreements
   * List all agreements with optional filters
   */
  @Get()
  async findAll(@Query() query: QueryAgreementsDto) {
    return await this.agreementsService.findAll(query);
  }

  /**
   * GET /api/agreements/:id
   * Get a specific agreement by ID
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.agreementsService.findOne(id);
  }

  /**
   * PUT /api/agreements/:id
   * Update an agreement
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateAgreementDto: UpdateAgreementDto,
  ) {
    return await this.agreementsService.update(id, updateAgreementDto);
  }

  /**
   * DELETE /api/agreements/:id
   * Terminate an agreement (soft delete)
   */
  @Delete(':id')
  async terminate(
    @Param('id') id: string,
    @Body() terminateDto: TerminateAgreementDto,
  ) {
    return await this.agreementsService.terminate(id, terminateDto);
  }

  /**
   * POST /api/agreements/:id/pay
   * Record a payment for an agreement
   */
  @Post(':id/pay')
  @HttpCode(HttpStatus.CREATED)
  async recordPayment(
    @Param('id') id: string,
    @Body() recordPaymentDto: RecordPaymentDto,
  ) {
    return await this.agreementsService.recordPayment(id, recordPaymentDto);
  }

  /**
   * GET /api/agreements/:id/payments
   * Get all payments for an agreement
   */
  @Get(':id/payments')
  async getPayments(@Param('id') id: string) {
    return await this.agreementsService.getPayments(id);
  }

  /**
   * GET /api/agreements/:id/disputes
   * Get all disputes for an agreement
   */
  @Get(':id/disputes')
  async getDisputes(@Param('id') id: string) {
    return await this.disputesService.getDisputesByAgreement(id);
  }
}
