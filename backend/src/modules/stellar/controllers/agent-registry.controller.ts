import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { AgentRegistryService } from '../services/agent-registry.service';
import {
  RegisterAgentDto,
  VerifyAgentDto,
  RateAgentDto,
  RegisterTransactionDto,
} from '../dto/agent-registry.dto';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { ApiPaginatedResponse } from '../../../common/decorators/api-paginated-response.decorator';
import { AgentTransaction } from '../entities/agent-transaction.entity';

@ApiTags('Agent Registry')
@ApiBearerAuth()
@Controller('agents/registry')
export class AgentRegistryController {
  constructor(private readonly agentRegistry: AgentRegistryService) {}

  @ApiResponse({ status: 201, description: 'Created' })
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

  @ApiResponse({ status: 201, description: 'Created' })
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

  @ApiResponse({ status: 201, description: 'Created' })
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

  @ApiResponse({ status: 200, description: 'Retrieved' })
  @Get(':agentAddress')
  @ApiOperation({ summary: 'Get agent information from blockchain' })
  async getAgentInfo(@Param('agentAddress') agentAddress: string) {
    const info = await this.agentRegistry.getAgentInfo(agentAddress);
    if (!info) {
      return { message: 'Agent not found' };
    }
    return info;
  }

  @ApiResponse({ status: 200, description: 'Retrieved' })
  @Get()
  @ApiOperation({ summary: 'Get total agent count' })
  async getAgentCount() {
    const count = await this.agentRegistry.getAgentCount();
    return { count };
  }

  @ApiResponse({ status: 201, description: 'Created' })
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

  @ApiResponse({ status: 200, description: 'Retrieved' })
  @Get('transactions/:agentAddress')
  @ApiOperation({ summary: 'Get transactions for an agent' })
  @ApiPaginatedResponse(AgentTransaction)
  async getAgentTransactions(
    @Param('agentAddress') agentAddress: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.agentRegistry.getAgentTransactions(
      agentAddress,
      query.page,
      query.limit,
    );
  }
}
