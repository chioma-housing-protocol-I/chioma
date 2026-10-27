import { Logger } from '@nestjs/common';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import { resolveApmConfig } from './apm.config';

const logger = new Logger('Tracing');

// Set up logging for OpenTelemetry itself (optional but helpful for debugging)
if (process.env.OTEL_LOG_LEVEL) {
  diag.setLogger(
    new DiagConsoleLogger(),
    process.env.OTEL_LOG_LEVEL === 'debug'
      ? DiagLogLevel.DEBUG
      : DiagLogLevel.INFO,
  );
}

// Resolve the APM backend (Datadog, New Relic or a generic OTLP collector).
// Request duration comes from the HTTP/Express spans and DB query times from
// the pg/TypeORM spans produced by the auto-instrumentations.
const apmConfig = resolveApmConfig();

export const tracingSDK = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: apmConfig.serviceName,
    [ATTR_SERVICE_VERSION]: apmConfig.serviceVersion,
    'deployment.environment': apmConfig.environment,
  }),
  traceExporter: new OTLPTraceExporter({
    url: apmConfig.tracesEndpoint,
    headers: apmConfig.headers,
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

export function startTracing(): void {
  try {
    tracingSDK.start();
    logger.log(
      `🚀 OpenTelemetry tracing started (APM provider: ${apmConfig.provider})`,
    );
  } catch (error) {
    logger.error('❌ Error starting OpenTelemetry tracing:', error);
  }
}

export async function shutdownTracing(): Promise<void> {
  try {
    await tracingSDK.shutdown();
    logger.log('🛑 OpenTelemetry tracing shut down');
  } catch (error) {
    logger.error('❌ Error shutting down OpenTelemetry tracing:', error);
  }
}
