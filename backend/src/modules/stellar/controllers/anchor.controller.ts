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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AnchorService } from '../services/anchor.service';
import { DepositRequestDto } from '../dto/deposit-request.dto';
import { WithdrawRequestDto } from '../dto/withdraw-request.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Anchor')
@ApiBearerAuth('JWT-auth')
@Controller('v1/anchor')
@UseGuards(JwtAuthGuard)
export class AnchorController {
  constructor(private readonly anchorService: AnchorService) {}

  @Post('deposit')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Initiate fiat deposit',
    description: 'Start a fiat deposit flow via Stellar anchor.',
  })
  @ApiResponse({ status: 201, description: 'Deposit initiated' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deposit(@Body() dto: DepositRequestDto) {
    return this.anchorService.initiateDeposit(dto);
  }

  @Post('withdraw')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Initiate fiat withdrawal',
    description: 'Start a fiat withdrawal via Stellar anchor.',
  })
  @ApiResponse({ status: 201, description: 'Withdrawal initiated' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async withdraw(@Body() dto: WithdrawRequestDto) {
    return this.anchorService.initiateWithdrawal(dto);
  }

  @Get('transactions/:id')
  @ApiOperation({ summary: 'Get anchor transaction status' })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  @ApiResponse({ status: 200, description: 'Transaction status' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async getTransactionStatus(@Param('id') id: string) {
    return this.anchorService.getTransactionStatus(id);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Anchor webhook',
    description: 'Called by anchor to notify status. Not for client use.',
  })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  async handleWebhook(@Body() payload: Record<string, unknown>) {
    await this.anchorService.handleWebhook(payload);
    return { success: true };
  }
}
