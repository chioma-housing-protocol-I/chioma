import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import {
  USE_REPLICA_METADATA_KEY,
  ReplicaOptions,
} from '../decorators/use-replica.decorator';

export interface ReplicaRequestContext {
  useReplica: boolean;
  replicaOptions?: ReplicaOptions;
}

/**
 * Interceptor that detects the @UseReplica() decorator on handler methods
 * and sets a flag on the request object indicating the route should be
 * routed to a read-replica data source.
 *
 * Downstream services and repository methods can read `req.__useReplica`
 * to decide whether to use a replica query runner.
 *
 * When no replica infrastructure is configured (DB_REPLICA_* env vars missing),
 * the flag is still set but queries fall through to the primary as usual.
 */
@Injectable()
export class ReadReplicaInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ReadReplicaInterceptor.name);

  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const options = this.reflector.getAllAndOverride<
      ReplicaOptions | undefined
    >(USE_REPLICA_METADATA_KEY, [context.getHandler(), context.getClass()]);

    if (options) {
      const req = context.switchToHttp().getRequest();
      req.__useReplica = true;
      req.__replicaOptions = options;

      this.logger.debug(
        `Read-replica routing enabled for ${req.method} ${req.path} (maxStaleness: ${options.maxStaleness ?? 'unbounded'})`,
      );
    }

    return next.handle();
  }
}

/**
 * Helper to check whether the current request should use a read-replica.
 */
export function shouldUseReplica(req: any): boolean {
  return req?.__useReplica === true;
}

/**
 * Helper to get the replica options for the current request.
 */
export function getReplicaOptions(req: any): ReplicaOptions | undefined {
  return req?.__replicaOptions;
}
