import {
  CallHandler,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  Logger,
  NestInterceptor,
  Type,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RESPONSE_SCHEMA_DTO_KEY } from '../decorators/validate-response-schema.decorator';
import { OpenApiDocumentRegistryService } from '../validation/openapi-document-registry.service';
import { validateAgainstSchema } from '../validation/schema-validator';

/**
 * Validates responses from handlers annotated with `@ValidateResponseSchema`
 * against the OpenAPI schema Nest generated for that DTO, closing the gap
 * where a response could silently drift from its documented shape.
 *
 * Defaults to logging violations (never breaks a response) since the
 * schemas are best-effort derivations of existing decorators, not
 * hand-verified contracts. Set RESPONSE_SCHEMA_VALIDATION_STRICT=true to
 * reject non-conforming responses with a 500 once you've confirmed a route
 * is clean.
 */
@Injectable()
export class ResponseSchemaValidationInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ResponseSchemaValidationInterceptor.name);
  private readonly strict: boolean;

  constructor(
    private readonly reflector: Reflector,
    private readonly documentRegistry: OpenApiDocumentRegistryService,
    private readonly configService: ConfigService,
  ) {
    this.strict =
      this.configService.get<string>(
        'RESPONSE_SCHEMA_VALIDATION_STRICT',
        'false',
      ) === 'true';
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const dto = this.reflector.get<Type<unknown> | undefined>(
      RESPONSE_SCHEMA_DTO_KEY,
      context.getHandler(),
    );

    if (!dto) {
      return next.handle();
    }

    return next.handle().pipe(
      tap((body) => {
        this.validate(dto, body, context);
      }),
    );
  }

  private validate(
    dto: Type<unknown>,
    body: unknown,
    context: ExecutionContext,
  ): void {
    const schema = this.documentRegistry.getSchema(dto.name);
    if (!schema) {
      return;
    }

    const errors = validateAgainstSchema(
      schema,
      body,
      this.documentRegistry.getComponents(),
    );

    if (errors.length === 0) {
      return;
    }

    const handlerName = `${context.getClass().name}.${context.getHandler().name}`;
    this.logger.error(
      `Response from ${handlerName} does not match ${dto.name} schema: ${errors.join('; ')}`,
    );

    if (this.strict) {
      throw new InternalServerErrorException(
        'Response failed schema validation',
      );
    }
  }
}
