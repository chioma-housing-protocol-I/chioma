import * as express from 'express';
import {
  INestApplication,
  Controller,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { WebhookSignatureGuard } from '../src/modules/webhooks/guards/webhook-signature.guard';
import { WebhookSecret } from '../src/modules/webhooks/decorators/webhook-secret.decorator';
import { WebhookSignatureService } from '../src/modules/webhooks/webhook-signature.service';

@Controller('webhook-test')
class TestWebhookController {
  @Post()
  @UseGuards(WebhookSignatureGuard)
  @WebhookSecret('WEBHOOK_SIGNATURE_SECRET')
  handle(@Body() body: Record<string, unknown>) {
    return { received: body };
  }
}

describe('Webhook signature verification (e2e)', () => {
  let app: INestApplication;
  let signatureService: WebhookSignatureService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              WEBHOOK_SIGNATURE_SECRET: 'integration-secret',
            }),
          ],
        }),
      ],
      providers: [WebhookSignatureService, WebhookSignatureGuard],
      controllers: [TestWebhookController],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(
      express.json({
        verify: (
          req: express.Request & { rawBody?: string },
          _res,
          buffer: Buffer,
        ) => {
          req.rawBody = buffer.toString('utf8');
        },
      }),
    );
    await app.init();
    signatureService = moduleRef.get(WebhookSignatureService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects unsigned webhooks', async () => {
    await request(app.getHttpServer())
      .post('/webhook-test')
      .send({ ok: true })
      .expect(401);
  });

  it('accepts valid signed webhooks', async () => {
    const payload = JSON.stringify({ ok: true });
    const timestamp = Date.now().toString();
    const signature = signatureService.generateSignature(
      payload,
      timestamp,
      'integration-secret',
    );

    await request(app.getHttpServer())
      .post('/webhook-test')
      .set('Content-Type', 'application/json')
      .set('X-Webhook-Timestamp', timestamp)
      .set('X-Webhook-Signature', signature)
      .send(payload)
      .expect(201);
  });
});
