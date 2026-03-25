import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DeveloperService } from './developer.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiParam } from '@nestjs/swagger';

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
      'Create a new API key for use with X-API-Key header. The raw key is returned only once.',
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
    description: 'List your API keys (masked). Requires JWT.',
  })
  @ApiResponse({ status: 200, description: 'List of API keys' })
  async listKeys(@Req() req: { user: { id: string } }) {
    return this.developerService.listKeys(req.user.id);
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
