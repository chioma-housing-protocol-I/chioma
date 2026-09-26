import { Global, Module } from '@nestjs/common';
import { BulkheadService } from './bulkhead.service';
import { FallbackService } from './fallback.service';
import { DegradationService } from './degradation.service';
import { IncidentService } from './incident.service';
import { TimeoutService } from './timeout.service';
import { CascadeDetectorService } from './cascade-detector.service';
import { CircuitBreakerService } from './circuit-breaker.service';

/**
 * Groups the platform resilience patterns (bulkhead isolation, fallback
 * execution, graceful degradation, incident tracking, timeout enforcement,
 * cascade detection, and circuit breaking) into a single globally-available
 * module so any feature module can inject them without re-importing.
 */
@Global()
@Module({
  providers: [
    BulkheadService,
    FallbackService,
    DegradationService,
    IncidentService,
    TimeoutService,
    CascadeDetectorService,
    CircuitBreakerService,
  ],
  exports: [
    BulkheadService,
    FallbackService,
    DegradationService,
    IncidentService,
    TimeoutService,
    CascadeDetectorService,
    CircuitBreakerService,
  ],
})
export class ResilienceModule {}
