import { SetMetadata, Type } from '@nestjs/common';

export const RESPONSE_SCHEMA_DTO_KEY = 'response_schema_dto';

/**
 * Opts a handler in to runtime OpenAPI schema validation of its response
 * body (see ResponseSchemaValidationInterceptor). Purely additive — keep
 * your existing `@ApiOkResponse`/`@ApiResponse({ type })` decorators for
 * Swagger docs, this just tells the interceptor which DTO's generated
 * schema to check the actual response against.
 */
export function ValidateResponseSchema(dto: Type<unknown>) {
  return SetMetadata(RESPONSE_SCHEMA_DTO_KEY, dto);
}
