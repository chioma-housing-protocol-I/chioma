import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable, of, tap } from 'rxjs';
import { CacheService } from '../cache/cache.service';
import {
  CACHE_PREFIX_HTTP_RESPONSE,
  TTL_HTTP_RESPONSE_MS,
} from '../cache/cache.constants';

/**
 * Generic URL-keyed response cache for GET endpoints (#2081). Unlike the
 * domain-specific caching in `PropertiesService` (which uses `@Cached()` /
 * `CacheService.getOrSet` with hand-picked keys and dependency tags per
 * query shape), this interceptor is a drop-in `@UseInterceptors()` for any
 * GET route that has no existing caching: it keys purely off the request
 * URL (path + query string), so two different query strings on the same
 * path are cached separately.
 *
 * Invalidation scope: applying `@UseInterceptors(CacheResponseInterceptor)`
 * to a GET route also registers that cached entry under a dependency tag
 * for the route's base resource path (the first path segment, e.g.
 * `/properties/abc?x=1` tags as `http:response:dep:/properties`). Any
 * mutating request (POST/PUT/PATCH/DELETE) under that same base path run
 * through this interceptor invalidates every cached GET for that resource,
 * not just the exact URL that was mutated — so a `PATCH /properties/:id`
 * also clears the cached `GET /properties` list, not only the cached
 * `GET /properties/:id` detail view. A handler that needs a narrower or
 * wider invalidation scope than "same first path segment" should use
 * `CacheService` directly instead of this interceptor.
 */
@Injectable()
export class CacheResponseInterceptor implements NestInterceptor {
  constructor(private readonly cacheService: CacheService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<Request>();
    const basePathTag = this.baseResourceTag(request.path);

    if (this.isMutatingMethod(request.method)) {
      // Invalidate only after the mutation itself succeeds, so a failed
      // write (validation error, 500, etc.) never evicts still-valid cache
      // entries.
      return next.handle().pipe(
        tap(() => {
          void this.cacheService.invalidateDependencies([basePathTag]);
        }),
      );
    }

    if (request.method !== 'GET') {
      return next.handle();
    }

    const cacheKey = this.cacheKeyForUrl(request.originalUrl ?? request.url);
    const cached = await this.cacheService.get(cacheKey);
    if (cached !== null) {
      return of(cached);
    }

    return next.handle().pipe(
      tap((data) => {
        void this.cacheService.set(cacheKey, data, TTL_HTTP_RESPONSE_MS, [
          basePathTag,
        ]);
      }),
    );
  }

  private isMutatingMethod(method: string): boolean {
    return (
      method === 'POST' ||
      method === 'PUT' ||
      method === 'PATCH' ||
      method === 'DELETE'
    );
  }

  private cacheKeyForUrl(url: string): string {
    return `${CACHE_PREFIX_HTTP_RESPONSE}:${url}`;
  }

  /** First path segment (e.g. `/properties/abc/reviews` -> `/properties`). */
  private baseResourceTag(path: string): string {
    const firstSegment = path.split('/').filter(Boolean)[0] ?? '';
    return `${CACHE_PREFIX_HTTP_RESPONSE}:dep:/${firstSegment}`;
  }
}
