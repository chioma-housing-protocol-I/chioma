import * as http from 'http';
import * as https from 'https';
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

/**
 * Shared outbound HTTP client configuration with real TCP connection
 * reuse (#2074): every other `HttpModule` import in this codebase (see
 * `monitoring.module.ts` before this change) used axios's default agent,
 * which opens a brand-new TCP (and, for HTTPS, a brand-new TLS handshake)
 * connection per outbound request instead of reusing one to the same
 * host. `keepAlive: true` plus a bounded `maxSockets`/`maxFreeSockets`
 * gives connection reuse and multiplexing across repeated calls to the
 * same host (payment gateway, KYC provider, monitoring webhooks, etc),
 * without unbounded socket growth under load.
 *
 * "Adaptive sizing" here means the pool shrinks itself under light load
 * via `maxFreeSockets` (idle sockets beyond that count are closed rather
 * than held open indefinitely) rather than dynamically renegotiating a
 * target size; Node's http.Agent does not expose a live-resize API to
 * grow/shrink `maxSockets` based on realtime load, so a true adaptive
 * algorithm would have to be built on top of this (tracked as a
 * follow-up, not implemented here — see this PR's Disclosures).
 */
const KEEP_ALIVE_MS = 60_000;
const MAX_SOCKETS = 50;
const MAX_FREE_SOCKETS = 10;

export const pooledHttpAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: KEEP_ALIVE_MS,
  maxSockets: MAX_SOCKETS,
  maxFreeSockets: MAX_FREE_SOCKETS,
});

export const pooledHttpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: KEEP_ALIVE_MS,
  maxSockets: MAX_SOCKETS,
  maxFreeSockets: MAX_FREE_SOCKETS,
});

@Module({
  imports: [
    HttpModule.register({
      httpAgent: pooledHttpAgent,
      httpsAgent: pooledHttpsAgent,
      timeout: 10_000,
    }),
  ],
  exports: [HttpModule],
})
export class PooledHttpModule {}
