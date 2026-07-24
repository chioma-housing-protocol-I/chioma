import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { DeveloperService } from './developer.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto, RotateApiKeyDto } from './dto/update-api-key.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Developer Portal')
@ApiBearerAuth('JWT-auth')
@Controller('developer')
@UseGuards(JwtAuthGuard)
export class DeveloperController {
  constructor(private readonly developerService: DeveloperService) {}

  @Post('api-keys')
  @ApiOperation({
    summary: 'Create API key',
    description:
      'Create a new API key for use with X-API-Key header. The raw key is returned only once. Key expires in 90 days by default.',
  })
  @ApiResponse({
    status: 201,
    description: 'API key created',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        key: { type: 'string' },
        name: { type: 'string' },
        expiresAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createKey(
    @Req() req: { user: { id: string } },
    @Body() dto: CreateApiKeyDto,
  ) {
    return this.developerService.createKey(req.user.id, dto.name);
  }

  @Get('api-keys')
  @ApiOperation({
    summary: 'List API keys',
    description:
      'List your API keys (masked). Includes expiration status and warnings. Requires JWT.',
  })
  @ApiResponse({ status: 200, description: 'List of API keys' })
  async listKeys(@Req() req: { user: { id: string } }) {
    return this.developerService.listKeys(req.user.id);
  }

  @Get('api-keys/expiring-soon')
  @ApiOperation({
    summary: 'Get keys expiring soon',
    description:
      'Get API keys that will expire within the next 30 days. Useful for proactive rotation reminders.',
  })
  @ApiResponse({ status: 200, description: 'List of keys expiring soon' })
  async getKeysExpiringSoon(@Req() req: { user: { id: string } }) {
    return this.developerService.getKeysExpiringSoon(req.user.id);
  }

  @Get('api-keys/:id')
  @ApiOperation({
    summary: 'Get API key details',
    description: 'Get detailed information about a specific API key.',
  })
  @ApiParam({ name: 'id', description: 'API key ID' })
  @ApiResponse({ status: 200, description: 'API key details' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async getKey(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    const key = await this.developerService.getKey(req.user.id, id);
    return {
      id: key.id,
      name: key.name,
      prefix: key.keyPrefix ?? 'chioma_sk_...',
      lastUsedAt: key.lastUsedAt,
      createdAt: key.createdAt,
      expiresAt: key.expiresAt,
      isNearExpiration: key.isNearExpiration(),
      isExpired: key.isExpired(),
      status: key.status,
      isRotated: key.isRotated,
      rotatedAt: key.rotatedAt,
    };
  }

  @Patch('api-keys/:id')
  @ApiOperation({
    summary: 'Update API key',
    description: 'Update API key name and/or expiration date.',
  })
  @ApiParam({ name: 'id', description: 'API key ID' })
  @ApiResponse({ status: 200, description: 'API key updated' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async updateKey(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() dto: UpdateApiKeyDto,
  ) {
    const updates: { name?: string; expiresAt?: Date } = {};

    if (dto.name) {
      updates.name = dto.name;
    }

    if (dto.expiresAt) {
      updates.expiresAt = new Date(dto.expiresAt);
    }

    const key = await this.developerService.updateKey(req.user.id, id, updates);
    return {
      id: key.id,
      name: key.name,
      expiresAt: key.expiresAt,
    };
  }

  @Post('api-keys/:id/rotate')
  @ApiOperation({
    summary: 'Rotate API key',
    description:
      'Generate a new API key while keeping the old one active for a transition period (7 days). The new raw key is returned only once.',
  })
  @ApiParam({ name: 'id', description: 'API key ID' })
  @ApiResponse({
    status: 201,
    description: 'New API key created (old key still valid during transition)',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        key: { type: 'string' },
        name: { type: 'string' },
        expiresAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Cannot rotate inactive key' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async rotateKey(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() dto: RotateApiKeyDto,
  ) {
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : undefined;
    return this.developerService.rotateKey(req.user.id, id, expiresAt);
  }

  @Get('api-keys/:id/rotation-history')
  @ApiOperation({
    summary: 'Get rotation history',
    description: 'View the rotation history for a specific API key.',
  })
  @ApiParam({ name: 'id', description: 'API key ID' })
  @ApiResponse({ status: 200, description: 'List of rotations' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async getRotationHistory(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    const history = await this.developerService.getRotationHistory(
      req.user.id,
      id,
    );
    return history.map((h) => ({
      id: h.id,
      rotatedAt: h.rotatedAt,
      oldKeyPrefix: h.oldKeyPrefix,
      newKeyPrefix: h.newKeyPrefix,
    }));
  }

  @Delete('api-keys/:id')
  @ApiOperation({ summary: 'Revoke API key' })
  @ApiParam({ name: 'id', description: 'API key ID' })
  @ApiResponse({ status: 200, description: 'API key revoked' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async revokeKey(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    await this.developerService.revokeKey(req.user.id, id);
    return { success: true };
  }
}
