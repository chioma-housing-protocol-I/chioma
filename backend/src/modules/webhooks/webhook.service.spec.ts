import { Test, TestingModule } from '@nestjs/testing';
import { WebhookSignatureService } from './webhook-signature.service';

describe('WebhookSignatureService', () => {
  let service: WebhookSignatureService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WebhookSignatureService],
    }).compile();

    service = module.get<WebhookSignatureService>(WebhookSignatureService);
  });

  it('generates deterministic HMAC signatures', () => {
    const signatureOne = service.generateSignature(
      '{"event":"screening.completed"}',
      '1711453200000',
      'test-secret',
    );
    const signatureTwo = service.generateSignature(
      '{"event":"screening.completed"}',
      '1711453200000',
      'test-secret',
    );

    expect(signatureOne).toBe(signatureTwo);
  });

  it('rejects unsigned webhooks', () => {
    expect(() =>
      service.verifySignature(
        '{"ok":true}',
        undefined,
        undefined,
        'test-secret',
      ),
    ).toThrow('Missing webhook signature');
  });

  it('rejects invalid signatures', () => {
    expect(() =>
      service.verifySignature(
        '{"ok":true}',
        'deadbeef',
        Date.now().toString(),
        'test-secret',
      ),
    ).toThrow('Invalid webhook signature');
  });

  it('accepts valid signatures inside the tolerance window', () => {
    const payload = '{"ok":true}';
    const timestamp = Date.now().toString();
    const signature = service.generateSignature(
      payload,
      timestamp,
      'test-secret',
    );

    expect(() =>
      service.verifySignature(payload, signature, timestamp, 'test-secret'),
    ).not.toThrow();
  });
});
