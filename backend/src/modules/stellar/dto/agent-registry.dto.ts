import { IsString, IsNumber, Min, Max, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterAgentDto {
  @ApiProperty({ description: 'Agent Stellar public key' })
  @IsString()
  agentAddress: string;

  @ApiProperty({ description: 'IPFS or external profile hash' })
  @IsString()
  profileHash: string;
}

export class VerifyAgentDto {
  @ApiProperty({ description: 'Agent Stellar public key to verify' })
  @IsString()
  agentAddress: string;
}

export class RateAgentDto {
  @ApiProperty({ description: 'Rater Stellar public key' })
  @IsString()
  raterAddress: string;

  @ApiProperty({ description: 'Agent Stellar public key' })
  @IsString()
  agentAddress: string;

  @ApiProperty({ description: 'Rating score (1-5)', minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  score: number;

  @ApiProperty({ description: 'Transaction ID for rating' })
  @IsString()
  transactionId: string;
}

export class RegisterTransactionDto {
  @ApiProperty({ description: 'Unique transaction identifier' })
  @IsString()
  transactionId: string;

  @ApiProperty({ description: 'Agent Stellar public key' })
  @IsString()
  agentAddress: string;

  @ApiProperty({ description: 'Array of party addresses involved' })
  @IsArray()
  @IsString({ each: true })
  parties: string[];
}

export class CompleteTransactionDto {
  @ApiProperty({ description: 'Transaction ID to complete' })
  @IsString()
  transactionId: string;

  @ApiProperty({ description: 'Agent Stellar public key' })
  @IsString()
  agentAddress: string;
}
