import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AnchorService } from '../services/anchor.service';
import { DepositRequestDto } from '../dto/deposit-request.dto';
import { WithdrawRequestDto } from '../dto/withdraw-request.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('api/v1/anchor')
@UseGuards(JwtAuthGuard)
export class AnchorController {
  constructor(private readonly anchorService: AnchorService) {}

  @Post('deposit')
  @HttpCode(HttpStatus.CREATED)
  async deposit(@Body() dto: DepositRequestDto) {
    return this.anchorService.initiateDeposit(dto);
  }

  @Post('withdraw')
  @HttpCode(HttpStatus.CREATED)
  async withdraw(@Body() dto: WithdrawRequestDto) {
    return this.anchorService.initiateWithdrawal(dto);
  }

  @Get('transactions/:id')
  async getTransactionStatus(@Param('id') id: string) {
    return this.anchorService.getTransactionStatus(id);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() payload: any) {
    await this.anchorService.handleWebhook(payload);
    return { success: true };
  }
}
