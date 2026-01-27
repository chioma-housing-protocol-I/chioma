import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { ApiKeyService, CreateApiKeyDto } from './api-key.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsDateString,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { ApiKeyScope } from './api-key.entity';

interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
}

class CreateApiKeyRequestDto implements CreateApiKeyDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(ApiKeyScope, { each: true })
  scopes?: ApiKeyScope[];

  @IsOptional()
  @IsDateString()
  expiresAt?: Date;

  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(100000)
  rateLimit?: number;
}

@ApiTags('API Keys')
@ApiBearerAuth('JWT-auth')
@Controller('api/api-keys')
@UseGuards(JwtAuthGuard)
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  /**
   * Create a new API key
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new API key' })
  @ApiResponse({
    status: 201,
    description: 'API key created. The raw key is only shown once.',
  })
  async createApiKey(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateApiKeyRequestDto,
  ) {
    const result = await this.apiKeyService.createApiKey(user.id, dto);
    return {
      message:
        'API key created successfully. Save this key - it will not be shown again.',
      apiKey: {
        id: result.apiKey.id,
        name: result.apiKey.name,
        keyPrefix: result.apiKey.keyPrefix,
        scopes: result.apiKey.scopes,
        expiresAt: result.apiKey.expiresAt,
        rateLimit: result.apiKey.rateLimit,
        createdAt: result.apiKey.createdAt,
      },
      rawKey: result.rawKey,
    };
  }

  /**
   * List all API keys for current user
   */
  @Get()
  @ApiOperation({ summary: 'List all API keys' })
  @ApiResponse({ status: 200, description: 'List of API keys' })
  async listApiKeys(@CurrentUser() user: AuthenticatedUser) {
    const keys = await this.apiKeyService.listApiKeys(user.id);
    return keys.map((key) => ({
      id: key.id,
      name: key.name,
      description: key.description,
      keyPrefix: key.keyPrefix,
      scopes: key.scopes,
      isActive: key.isActive,
      expiresAt: key.expiresAt,
      lastUsedAt: key.lastUsedAt,
      rateLimit: key.rateLimit,
      requestCount: key.requestCount,
      createdAt: key.createdAt,
    }));
  }

  /**
   * Revoke an API key (disable without deleting)
   */
  @Post(':id/revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke an API key' })
  @ApiResponse({ status: 200, description: 'API key revoked' })
  async revokeApiKey(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.apiKeyService.revokeApiKey(user.id, id);
    return { message: 'API key revoked successfully' };
  }

  /**
   * Delete an API key permanently
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an API key' })
  @ApiResponse({ status: 200, description: 'API key deleted' })
  async deleteApiKey(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.apiKeyService.deleteApiKey(user.id, id);
    return { message: 'API key deleted successfully' };
  }
}
