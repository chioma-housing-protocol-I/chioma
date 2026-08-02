import { Global, Module } from '@nestjs/common';
import { OpenApiDocumentRegistryService } from './openapi-document-registry.service';

@Global()
@Module({
  providers: [OpenApiDocumentRegistryService],
  exports: [OpenApiDocumentRegistryService],
})
export class OpenApiDocumentRegistryModule {}
