import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';
import * as tls from 'tls';
import type { PeerCertificate } from 'tls';

/**
 * Enforces TLS certificate pinning on outbound HTTPS calls to guard against
 * MITM attacks (e.g. via a compromised CA) on external API integrations.
 *
 * Pins are SHA-256 fingerprints of the leaf certificate, in the same
 * colon-separated hex format `openssl x509 -noout -fingerprint -sha256`
 * prints, so operators can generate them with standard tooling.
 *
 * Configured via:
 * - CERTIFICATE_PINNING_ENABLED ("true"/"false", default "false")
 * - CERTIFICATE_PINS: JSON object mapping hostname -> array of pins, e.g.
 *   {"api.paystack.co":["AA:BB:...:FF"]}
 *
 * Pinning is opt-in and only enforced for hosts with configured pins, so
 * unconfigured hosts keep Node's default (hostname-only) TLS validation.
 */
@Injectable()
export class CertificatePinningService {
  private readonly logger = new Logger(CertificatePinningService.name);
  private readonly enabled: boolean;
  private readonly pinsByHost: Map<string, string[]>;
  private readonly agentCache = new Map<string, https.Agent>();

  constructor(private readonly configService: ConfigService) {
    this.enabled =
      this.configService.get<string>('CERTIFICATE_PINNING_ENABLED', 'false') ===
      'true';
    this.pinsByHost = this.loadPins();
  }

  /**
   * Returns a (cached) https.Agent that enforces the configured pins for
   * `hostname`. Safe to call for any host, including hosts without
   * configured pins — those simply get standard TLS validation.
   */
  getHttpsAgent(hostname: string): https.Agent {
    const key = hostname.toLowerCase();
    const cached = this.agentCache.get(key);
    if (cached) {
      return cached;
    }

    const pins = this.pinsByHost.get(key);
    const agent = new https.Agent({
      keepAlive: true,
      checkServerIdentity: (host, cert) =>
        this.verifyServerIdentity(host, cert, pins),
    });

    this.agentCache.set(key, agent);
    return agent;
  }

  /**
   * Convenience helper for call sites that only have a full URL string.
   * Returns undefined for non-HTTPS or unparsable URLs so callers can skip
   * setting an httpsAgent.
   */
  getHttpsAgentForUrl(url: string): https.Agent | undefined {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:') {
        return undefined;
      }
      return this.getHttpsAgent(parsed.hostname);
    } catch {
      this.logger.warn(`Could not parse URL for certificate pinning: ${url}`);
      return undefined;
    }
  }

  private loadPins(): Map<string, string[]> {
    const raw = this.configService.get<string>('CERTIFICATE_PINS', '');
    const map = new Map<string, string[]>();
    if (!raw) {
      return map;
    }

    try {
      const parsed = JSON.parse(raw) as Record<string, string[]>;
      for (const [host, pins] of Object.entries(parsed)) {
        map.set(host.toLowerCase(), pins.map((pin) => pin.toUpperCase()));
      }
    } catch (error) {
      this.logger.error(
        `Failed to parse CERTIFICATE_PINS; certificate pinning will be inactive for all hosts: ${
          (error as Error).message
        }`,
      );
    }

    return map;
  }

  private verifyServerIdentity(
    host: string,
    cert: PeerCertificate,
    pins: string[] | undefined,
  ): Error | undefined {
    // Always keep Node's standard hostname verification — pinning
    // supplements it, it never replaces it.
    const defaultError = tls.checkServerIdentity(host, cert);
    if (defaultError) {
      return defaultError;
    }

    if (!this.enabled || !pins || pins.length === 0) {
      return undefined;
    }

    const fingerprint = cert.fingerprint256?.toUpperCase();
    if (!fingerprint || !pins.includes(fingerprint)) {
      this.logger.error(
        `Certificate pinning failure for ${host}: presented certificate fingerprint ` +
          `${fingerprint ?? 'unknown'} is not in the configured pin set`,
      );
      return new Error(`Certificate pinning validation failed for ${host}`);
    }

    return undefined;
  }
}
