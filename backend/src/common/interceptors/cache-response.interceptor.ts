import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Observable, of, tap } from 'rxjs';

@Injectable()
export class CacheResponseInterceptor implements NestInterceptor {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();

    // Only cache GET requests
    if (request.method !== 'GET') {
      return next.handle();
    }

    const cacheKey = `http:${request.url}:${JSON.stringify(request.user?.id || 'anon')}`;
    const cached = await this.cacheManager.get(cacheKey);

    if (cached) {
      return of(cached);
    }

    return next.handle().pipe(
      tap((data) => {
        void this.cacheManager.set(cacheKey, data, 60); // 60s TTL
      }),
    );
  }
}
