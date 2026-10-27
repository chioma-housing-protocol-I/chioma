import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Response-shrinking `?fields=` projection (#2055). Applied globally
 * (see app.module.ts), so any endpoint that returns a plain object,
 * array, or `{ data: [...] }` pagination envelope automatically
 * supports `?fields=id,name,email` to return only those top-level keys,
 * without each controller/service having to implement its own
 * projection logic.
 *
 * Deliberately top-level only: nested-path projection (e.g.
 * `fields=owner.name`) is not supported, since this codebase's response
 * shapes (entities with relations, DTOs) vary too much per endpoint for
 * a single generic interceptor to safely guess which nested shape is
 * "the data" versus metadata that should always survive filtering.
 */
@Injectable()
export class FieldFilteringInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const rawFields = request.query?.fields;

    if (typeof rawFields !== 'string' || rawFields.trim() === '') {
      return next.handle();
    }

    const fields = rawFields
      .split(',')
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    if (fields.length === 0) {
      return next.handle();
    }

    return next
      .handle()
      .pipe(map((body) => FieldFilteringInterceptor.project(body, fields)));
  }

  private static project(body: unknown, fields: string[]): unknown {
    if (Array.isArray(body)) {
      return body.map((item) => FieldFilteringInterceptor.pick(item, fields));
    }

    if (
      body &&
      typeof body === 'object' &&
      'data' in (body as Record<string, unknown>) &&
      Array.isArray((body as Record<string, unknown>).data)
    ) {
      // Paginated envelope (PaginatedResponseDto: { data, total, page,
      // limit, totalPages }): project each item in `data`, leave the
      // pagination metadata fields untouched.
      const envelope = body as Record<string, unknown>;
      return {
        ...envelope,
        data: (envelope.data as unknown[]).map((item) =>
          FieldFilteringInterceptor.pick(item, fields),
        ),
      };
    }

    return FieldFilteringInterceptor.pick(body, fields);
  }

  private static pick(item: unknown, fields: string[]): unknown {
    if (!item || typeof item !== 'object') {
      return item;
    }

    const source = item as Record<string, unknown>;
    const projected: Record<string, unknown> = {};
    for (const field of fields) {
      if (field in source) {
        projected[field] = source[field];
      }
    }
    return projected;
  }
}
