import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AgentRegistryService } from '../services/agent-registry.service';
import {
  RegisterAgentDto,
  VerifyAgentDto,
  RateAgentDto,
  RegisterTransactionDto,
} from '../dto/agent-registry.dto';

@ApiTags('Agent Registry')
@ApiBearerAuth()
@Controller('agents/registry')
export class AgentRegistryController {
  constructor(private readonly agentRegistry: AgentRegistryService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register agent on-chain' })
  async registerAgent(@Body() dto: RegisterAgentDto) {
    const txHash = await this.agentRegistry.registerAgent(
      dto.agentAddress,
      dto.profileHash,
    );
    return { txHash, message: 'Agent registered on-chain' };
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Admin] Verify agent on-chain' })
  async verifyAgent(@Body() dto: VerifyAgentDto) {
    const txHash = await this.agentRegistry.verifyAgent(
      dto.agentAddress,
      dto.agentAddress,
    );
    return { txHash, message: 'Agent verified on-chain' };
  }

  @Post('rate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rate agent after transaction completion' })
  async rateAgent(@Body() dto: RateAgentDto) {
    const txHash = await this.agentRegistry.rateAgent(
      dto.raterAddress,
      dto.agentAddress,
      dto.score,
      dto.transactionId,
    );
    return { txHash, message: 'Rating submitted on-chain' };
  }

  @Get(':agentAddress')
  @ApiOperation({ summary: 'Get agent information from blockchain' })
  async getAgentInfo(@Param('agentAddress') agentAddress: string) {
    const info = await this.agentRegistry.getAgentInfo(agentAddress);
    if (!info) {
      return { message: 'Agent not found' };
    }
    return info;
  }

  @Get()
  @ApiOperation({ summary: 'Get total agent count' })
  async getAgentCount() {
    const count = await this.agentRegistry.getAgentCount();
    return { count };
  }

  @Post('transactions/register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register transaction for agent' })
  async registerTransaction(@Body() dto: RegisterTransactionDto) {
    const txHash = await this.agentRegistry.registerTransaction(
      dto.transactionId,
      dto.agentAddress,
      dto.parties,
    );
    return { txHash, message: 'Transaction registered on-chain' };
  }

  @Get('transactions/:agentAddress')
  @ApiOperation({ summary: 'Get transactions for an agent' })
  async getAgentTransactions(@Param('agentAddress') agentAddress: string) {
    return this.agentRegistry.getAgentTransactions(agentAddress);
  }
}
