import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnchorService } from './services/anchor-service';
import { DepositRequestDto } from './dto/deposit-request.dto';
import { WithdrawRequestDto } from './dto/withdraw-request.dto';
import { AnchorTransaction } from './entities/anchor-transaction.entity';

@ApiTags('Anchor')
@Controller('api/v1/anchor')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StellarController {
  constructor(private readonly anchorService: AnchorService) {}

  @Post('deposit')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Initiate fiat deposit to USDC' })
  @ApiResponse({
    status: 201,
    description: 'Deposit initiated successfully',
    type: AnchorTransaction,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async initiateDeposit(
    @Request() req: any,
    @Body() depositRequest: DepositRequestDto,
  ): Promise<AnchorTransaction> {
    return this.anchorService.initiateDeposit(req.user.id, depositRequest);
  }

  @Post('withdraw')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Initiate USDC withdrawal to fiat' })
  @ApiResponse({
    status: 201,
    description: 'Withdrawal initiated successfully',
    type: AnchorTransaction,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async initiateWithdrawal(
    @Request() req: any,
    @Body() withdrawRequest: WithdrawRequestDto,
  ): Promise<AnchorTransaction> {
    return this.anchorService.initiateWithdrawal(req.user.id, withdrawRequest);
  }

  @Get('transactions/:id')
  @ApiOperation({ summary: 'Get transaction status' })
  @ApiResponse({
    status: 200,
    description: 'Transaction status retrieved',
    type: AnchorTransaction,
  })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTransactionStatus(
    @Param('id') transactionId: string,
  ): Promise<AnchorTransaction> {
    return this.anchorService.getTransactionStatus(transactionId);
  }

  // Webhook endpoint for anchor callbacks (would need to be public/unprotected)
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle anchor webhook callbacks' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  async handleWebhook(@Body() webhookData: any): Promise<{ status: string }> {
    await this.anchorService.handleAnchorWebhook(webhookData);
    return { status: 'processed' };
  }
}