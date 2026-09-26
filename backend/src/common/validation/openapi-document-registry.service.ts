import { Injectable, Logger } from '@nestjs/common';
import { OpenAPIObject } from '@nestjs/swagger';

/**
 * Holds the OpenAPI document generated once at bootstrap (see main.ts) so
 * runtime code — like ResponseSchemaValidationInterceptor — can look up the
 * JSON-Schema definition Nest already derived from `@ApiProperty`/
 * `@ApiPropertyOptional` decorators, without re-deriving it itself.
 */
@Injectable()
export class OpenApiDocumentRegistryService {
  private readonly logger = new Logger(OpenApiDocumentRegistryService.name);
  private document: OpenAPIObject | undefined;

  setDocument(document: OpenAPIObject): void {
    this.document = document;
  }

  /**
   * Returns the resolved JSON schema for a component by name (typically a
   * DTO class name), or undefined if the document hasn't been set yet or
   * the schema isn't registered (e.g. it's never referenced by
   * `@ApiProperty({ type })` anywhere, so Nest never emitted it).
   */
  getSchema(name: string): Record<string, unknown> | undefined {
    const schema = this.document?.components?.schemas?.[name];
    if (!schema) {
      this.logger.warn(
        `No OpenAPI schema registered for "${name}" — is it referenced by an @ApiProperty/@ApiOkResponse somewhere?`,
      );
      return undefined;
    }
    return schema as Record<string, unknown>;
  }

  getComponents(): NonNullable<OpenAPIObject['components']> | undefined {
    return this.document?.components;
  }
}
