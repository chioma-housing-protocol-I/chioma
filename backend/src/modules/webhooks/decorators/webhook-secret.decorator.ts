import { SetMetadata } from '@nestjs/common';

export const WEBHOOK_SECRET_METADATA_KEY = 'webhook-secret-key';

export const WebhookSecret = (configKey: string) =>
  SetMetadata(WEBHOOK_SECRET_METADATA_KEY, configKey);
