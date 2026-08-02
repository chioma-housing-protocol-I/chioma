import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import { WebhookEvent } from './webhook-event';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateWebhookEndpointDto } from './dto/create-webhook-endpoint.dto';
import { UpdateWebhookEndpointDto } from './dto/update-webhook-endpoint.dto';
import { TriggerWebhookEventDto } from './dto/trigger-webhook-event.dto';
import { RetryWebhookDeliveryDto } from './dto/retry-webhook-delivery.dto';

function normalizePayload(payload: unknown): Record<string, unknown> {
  if (payload === undefined || payload === null) return {};

  if (typeof payload === 'string') {
    try {
      const parsed: unknown = JSON.parse(payload);
      return typeof parsed === 'object' && parsed !== null
        ? (parsed as Record<string, unknown>)
        : { value: parsed };
    } catch {
      return { raw: payload };
    }
  }

  if (typeof payload === 'object') {
    return payload as Record<string, unknown>;
  }

  return { value: payload };
}

@ApiTags('Developer Webhooks')
@ApiBearerAuth('JWT-auth')
@Controller('developer/webhooks')
@UseGuards(JwtAuthGuard)
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post()
  @ApiOperation({
    summary: 'Register a webhook endpoint',
    description:
      'Register a URL to receive Chioma events. A signing secret is generated to use if none is provided.',
  })
  @ApiResponse({ status: 201, description: 'Webhook endpoint created' })
  async create(
    @Req() req: { user: { id: string } },
    @Body() dto: CreateWebhookEndpointDto,
  ) {
    return this.webhooksService.createEndpoint(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List your webhook endpoints' })
  @ApiResponse({ status: 200, description: 'List of webhook endpoints' })
  async list(@Req() req: { user: { id: string } }) {
    return this.webhooksService.listEndpointsForUser(req.user.id);
  }

  @Get(':id/deliveries')
  @ApiOperation({ summary: 'View delivery history for a webhook endpoint' })
  @ApiParam({ name: 'id', description: 'Webhook endpoint ID' })
  @ApiResponse({ status: 200, description: 'List of delivery attempts' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async listDeliveries(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.webhooksService.listDeliveriesForUser(req.user.id, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a webhook endpoint' })
  @ApiParam({ name: 'id', description: 'Webhook endpoint ID' })
  @ApiResponse({ status: 200, description: 'Webhook endpoint updated' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async update(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() dto: UpdateWebhookEndpointDto,
  ) {
    return this.webhooksService.updateEndpoint(req.user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a webhook endpoint' })
  @ApiParam({ name: 'id', description: 'Webhook endpoint ID' })
  @ApiResponse({ status: 200, description: 'Webhook endpoint deleted' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async remove(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    await this.webhooksService.deleteEndpoint(req.user.id, id);
    return { success: true };
  }

  @Post(':id/test')
  @ApiOperation({
    summary: 'Send a test event to a webhook endpoint',
    description:
      'Delivers a signed test payload to the endpoint immediately and records the attempt.',
  })
  @ApiParam({ name: 'id', description: 'Webhook endpoint ID' })
  @ApiResponse({ status: 201, description: 'Test delivery attempt recorded' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async test(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() dto: TriggerWebhookEventDto,
  ) {
    return this.webhooksService.triggerTestEvent(
      req.user.id,
      id,
      dto.event as WebhookEvent,
      normalizePayload(dto.payload),
    );
  }

  @Post(':id/retry')
  @ApiOperation({
    summary: 'Retry a webhook delivery',
    description:
      'Redelivers an existing delivery by deliveryId, or triggers a new delivery attempt using the provided event and payload.',
  })
  @ApiParam({ name: 'id', description: 'Webhook endpoint ID' })
  @ApiResponse({ status: 201, description: 'Retry delivery attempt recorded' })
  @ApiResponse({ status: 400, description: 'Missing event or deliveryId' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async retry(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() dto: RetryWebhookDeliveryDto,
  ) {
    return this.webhooksService.retryDelivery(req.user.id, id, {
      deliveryId: dto.deliveryId,
      event: dto.event as WebhookEvent | undefined,
      payload: normalizePayload(dto.payload),
    });
  }
}
