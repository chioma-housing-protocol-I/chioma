import { Global, Module } from '@nestjs/common';
import { CertificatePinningService } from './certificate-pinning.service';

@Global()
@Module({
  providers: [CertificatePinningService],
  exports: [CertificatePinningService],
})
export class CertificatePinningModule {}
