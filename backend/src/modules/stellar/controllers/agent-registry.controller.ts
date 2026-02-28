import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AgentRegistryService } from '../services/agent-registry.service';
import * as StellarSdk from '@stellar/stellar-sdk';

class RegisterAgentDto {
  profileHash: string;
  agentPublicKey: string;
  agentSecretKey: string; // NOTE: In prod, sign client-side — never send secrets to server
}

class RateAgentDto {
  agentPublicKey: string;
  rating: number;
  transactionId: string;
  raterPublicKey: string;
  raterSecretKey: string;
}

@ApiTags('Agent Registry')
@Controller('agents/registry')
export class AgentRegistryController {
  constructor(private readonly agentRegistry: AgentRegistryService) {}

  @Post('register')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register agent on-chain with profile hash' })
  async register(@Body() dto: RegisterAgentDto) {
    const keypair = StellarSdk.Keypair.fromSecret(dto.agentSecretKey);
    const txHash = await this.agentRegistry.registerAgent({
      agentPublicKey: dto.agentPublicKey,
      profileHash: dto.profileHash,
      agentKeypair: keypair,
    });
    return { txHash, message: 'Agent registered on-chain' };
  }

  @Get(':publicKey')
  @ApiOperation({ summary: 'Get on-chain agent profile and reputation' })
  async getProfile(@Param('publicKey') publicKey: string) {
    return this.agentRegistry.getAgentProfile(publicKey);
  }

  @Get(':publicKey/verified')
  @ApiOperation({ summary: 'Check if agent is admin-verified on-chain' })
  async isVerified(@Param('publicKey') publicKey: string) {
    const verified = await this.agentRegistry.isAgentVerified(publicKey);
    return { publicKey, isVerified: verified };
  }

  @Post(':publicKey/verify')
  @ApiOperation({ summary: '[Admin] Verify agent on-chain' })
  async verifyAgent(@Param('publicKey') publicKey: string) {
    const txHash = await this.agentRegistry.verifyAgent(publicKey);
    return { txHash, message: 'Agent verified on-chain' };
  }

  @Post('rate')
  @ApiOperation({ summary: 'Submit on-chain rating for agent (1-5 stars)' })
  async rateAgent(@Body() dto: RateAgentDto) {
    const raterKeypair = StellarSdk.Keypair.fromSecret(dto.raterSecretKey);
    const txHash = await this.agentRegistry.submitRating({
      agentPublicKey: dto.agentPublicKey,
      raterPublicKey: dto.raterPublicKey,
      rating: dto.rating,
      transactionId: dto.transactionId,
      raterKeypair,
    });
    return { txHash, message: 'Rating submitted on-chain' };
  }
}
