import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UseGuards,
  Res,
  Header,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { AgreementsService } from './agreements.service';
import { CreateAgreementDto } from './dto/create-agreement.dto';
import { UpdateAgreementDto } from './dto/update-agreement.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { TerminateAgreementDto } from './dto/terminate-agreement.dto';
import { QueryAgreementsDto } from './dto/query-agreements.dto';
import { RenewAgreementDto } from './dto/renew-agreement.dto';
import { QueryAgreementFeesDto } from './dto/query-agreement-fees.dto';
import { AuditLogInterceptor } from '../audit/interceptors/audit-log.interceptor';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Rent Agreements')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('agreements')
@UseInterceptors(AuditLogInterceptor)
export class AgreementsController {
  constructor(private readonly agreementsService: AgreementsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createAgreementDto: CreateAgreementDto) {
    return await this.agreementsService.create(createAgreementDto);
  }

  @Get()
  async findAll(@Query() query: QueryAgreementsDto) {
    return await this.agreementsService.findAll(query);
  }

  @Get(':id/download')
  @Header('Content-Type', 'application/pdf')
  async downloadAgreement(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.agreementsService.generateAgreementPdf(id);
    res.set({
      'Content-Disposition': `attachment; filename=agreement-${id}.pdf`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get(':id/fees')
  @ApiOperation({
    summary: 'Lease fee snapshot',
    description:
      'Returns configured early termination fee, late fee %, grace period, and an optional estimated late fee when daysPastDue is provided.',
  })
  @ApiParam({ name: 'id', description: 'Agreement UUID' })
  @ApiQuery({
    name: 'daysPastDue',
    required: false,
    description: 'Whole days after due date (for late fee estimate)',
  })
  async getFees(
    @Param('id') id: string,
    @Query() query: QueryAgreementFeesDto,
  ) {
    return await this.agreementsService.getFees(id, query.daysPastDue);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.agreementsService.findOne(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateAgreementDto: UpdateAgreementDto,
  ) {
    return await this.agreementsService.update(id, updateAgreementDto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Partially update agreement',
    description: 'Same payload rules as PUT; use for partial updates.',
  })
  async patchUpdate(
    @Param('id') id: string,
    @Body() updateAgreementDto: UpdateAgreementDto,
  ) {
    return await this.agreementsService.update(id, updateAgreementDto);
  }

  @Delete(':id')
  async terminate(
    @Param('id') id: string,
    @Body() terminateDto: TerminateAgreementDto,
  ) {
    return await this.agreementsService.terminate(id, terminateDto);
  }

  @Post(':id/renew')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Renew lease term',
    description:
      'Extends endDate by extendMonths (default 12) from the current end date when renewalOption is true.',
  })
  async renew(
    @Param('id') id: string,
    @Body() body: RenewAgreementDto,
  ) {
    return await this.agreementsService.renew(id, body);
  }

  @Post(':id/pay')
  @HttpCode(HttpStatus.CREATED)
  async recordPayment(
    @Param('id') id: string,
    @Body() recordPaymentDto: RecordPaymentDto,
  ) {
    return await this.agreementsService.recordPayment(id, recordPaymentDto);
  }

  @Get(':id/payments')
  async getPayments(@Param('id') id: string) {
    return await this.agreementsService.getPayments(id);
  }
}
