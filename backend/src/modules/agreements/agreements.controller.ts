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
  HttpStatus,
  UseInterceptors,
  UseGuards,
  Res,
  Header,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { AgreementsService } from './agreements.service';
import { CreateAgreementDto } from './dto/create-agreement.dto';
import { UpdateAgreementDto } from './dto/update-agreement.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { TerminateAgreementDto } from './dto/terminate-agreement.dto';
import { QueryAgreementsDto } from './dto/query-agreements.dto';
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

  @Delete(':id')
  async terminate(
    @Param('id') id: string,
    @Body() terminateDto: TerminateAgreementDto,
  ) {
    return await this.agreementsService.terminate(id, terminateDto);
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
