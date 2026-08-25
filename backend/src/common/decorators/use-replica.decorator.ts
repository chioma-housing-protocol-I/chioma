import { SetMetadata, applyDecorators } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';

export const USE_REPLICA_METADATA_KEY = 'use_replica';

export interface ReplicaOptions {
  /** Maximum acceptable staleness before data should be considered stale (e.g. '30s', '5m') */
  maxStaleness?: string;
  /** Human-readable description of why this route uses a replica */
  reason?: string;
}

/**
 * Marks a controller method as a read-heavy endpoint that should be routed
 * to a read-replica data source. When configured with replica infrastructure
 * (DB_REPLICA_* env vars), queries from this route will be directed to the
 * replica instead of the primary.
 *
 * Staleness tolerance is documented per path via the `maxStaleness` option.
 *
 * @example
 * ```ts
 * @Get('properties')
 * @UseReplica({ maxStaleness: '30s', reason: 'Browse listings tolerate brief lag' })
 * async searchProperties() { ... }
 * ```
 */
export function UseReplica(options: ReplicaOptions = {}) {
  return applyDecorators(
    SetMetadata(USE_REPLICA_METADATA_KEY, options),
    ApiOperation({ extensions: { 'x-use-replica': true, 'x-max-staleness': options.maxStaleness ?? 'unknown' } }),
  );
}
