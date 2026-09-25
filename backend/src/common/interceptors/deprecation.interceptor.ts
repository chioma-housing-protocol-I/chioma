import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import {
  DEPRECATION_KEY,
  DeprecationOptions,
} from '../decorators/deprecated.decorator';

@Injectable()
export class DeprecationInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const options = this.reflector.getAllAndOverride<DeprecationOptions>(
      DEPRECATION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (options && context.getType() === 'http') {
      const res = context.switchToHttp().getResponse();
      res.setHeader('Deprecation', 'true');
      res.setHeader('Sunset', new Date(options.sunset).toUTCString());
      if (options.link) {
        res.setHeader('Link', `<${options.link}>; rel="deprecation"`);
      }
    }

    return next.handle();
  }
}
