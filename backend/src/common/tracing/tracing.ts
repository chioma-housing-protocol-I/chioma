import { Logger } from '@nestjs/common';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';

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

const otlpEndpoint =
  process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ||
  'http://localhost:4318/v1/traces';

export const tracingSDK = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: otlpEndpoint,
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

export function startTracing(): void {
  try {
    tracingSDK.start();
    logger.log('🚀 OpenTelemetry tracing started');
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
