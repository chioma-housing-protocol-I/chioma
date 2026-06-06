import { Global, Module } from '@nestjs/common';
import { BulkheadService } from './bulkhead.service';
import { FallbackService } from './fallback.service';
import { DegradationService } from './degradation.service';
import { IncidentService } from './incident.service';
import { TimeoutService } from './timeout.service';

/**
 * Groups the platform resilience patterns (bulkhead isolation, fallback
 * execution, graceful degradation, incident tracking, and timeout enforcement)
 * into a single globally-available module so any feature module can inject
 * them without re-importing.
 */
@Global()
@Module({
  providers: [
    BulkheadService,
    FallbackService,
    DegradationService,
    IncidentService,
    TimeoutService,
  ],
  exports: [
    BulkheadService,
    FallbackService,
    DegradationService,
    IncidentService,
    TimeoutService,
  ],
})
export class ResilienceModule {}
