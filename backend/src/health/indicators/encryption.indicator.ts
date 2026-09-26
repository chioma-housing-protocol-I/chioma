import { Injectable, Logger } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { EncryptionService } from '../../modules/stellar/services/encryption.service';

/**
 * Health indicator for the EncryptionService.
 *
 * Performs two checks in sequence:
 *  1. Static key validation  — confirms the key passed at construction time
 *     (not empty, not the default placeholder, meets minimum length).
 *  2. Live round-trip test   — encrypts and immediately decrypts a known
 *     string to confirm the derived key material actually works end-to-end.
 *
 * Encryption is classified as `critical` in `health.constants.ts` because a
 * broken key makes every Stellar account secret stored in the database
 * unrecoverable, so the service must not accept traffic with an invalid key.
 */
@Injectable()
export class EncryptionHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(EncryptionHealthIndicator.name);

  constructor(private readonly encryptionService: EncryptionService) {
    super();
  }

  /**
   * @param key - Indicator name surfaced in the `/health` response body.
   *              Callers should pass `'encryption'`.
   */
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const startTime = Date.now();

    // ── Step 1: static key validity ─────────────────────────────────────────
    if (!this.encryptionService.isKeyValid()) {
      const reason =
        this.encryptionService.getKeyInvalidReason() ?? 'unknown reason';

      this.logger.error(`Encryption key is invalid: ${reason}`);

      const result = this.getStatus(key, false, {
        status: 'down',
        responseTime: Date.now() - startTime,
        reason,
      });

      throw new HealthCheckError('Encryption key is invalid', result);
    }

    // ── Step 2: live round-trip ──────────────────────────────────────────────
    try {
      this.encryptionService.testRoundTrip();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'round-trip test threw unexpectedly';

      this.logger.error(`Encryption round-trip self-test failed: ${message}`);

      const result = this.getStatus(key, false, {
        status: 'down',
        responseTime: Date.now() - startTime,
        reason: `Round-trip test failed: ${message}`,
      });

      throw new HealthCheckError('Encryption round-trip failed', result);
    }

    const responseTime = Date.now() - startTime;
    this.logger.log(`Encryption health check passed in ${responseTime}ms`);

    return this.getStatus(key, true, {
      status: 'up',
      responseTime,
    });
  }
}
