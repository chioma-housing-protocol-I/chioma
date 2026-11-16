/**
 * APM provider configuration for OpenTelemetry trace export.
 *
 * Traces are exported over OTLP/HTTP, which both Datadog (via the Datadog
 * Agent's OTLP intake) and New Relic (native OTLP endpoint) accept, so no
 * vendor-specific agent library is needed in the application.
 *
 * Select a provider with APM_PROVIDER:
 *   - `datadog`  → Datadog Agent OTLP intake (DD_AGENT_HOST, default `datadog-agent`)
 *   - `newrelic` → New Relic OTLP endpoint (requires NEW_RELIC_LICENSE_KEY)
 *   - `otlp`     → generic collector (Jaeger, OTel Collector) — the default
 *
 * OTEL_EXPORTER_OTLP_TRACES_ENDPOINT always overrides the resolved endpoint.
 */
export type ApmProvider = 'datadog' | 'newrelic' | 'otlp';

export interface ApmConfig {
  provider: ApmProvider;
  tracesEndpoint: string;
  headers: Record<string, string>;
  serviceName: string;
  serviceVersion: string;
  environment: string;
}

const NEW_RELIC_ENDPOINTS: Record<string, string> = {
  us: 'https://otlp.nr-data.net:4318/v1/traces',
  eu: 'https://otlp.eu01.nr-data.net:4318/v1/traces',
};

function parseProvider(value: string | undefined): ApmProvider {
  const normalized = (value ?? '').trim().toLowerCase();
  if (normalized === 'datadog' || normalized === 'newrelic') {
    return normalized;
  }
  return 'otlp';
}

export function resolveApmConfig(
  env: NodeJS.ProcessEnv = process.env,
): ApmConfig {
  const provider = parseProvider(env.APM_PROVIDER);
  const headers: Record<string, string> = {};
  let tracesEndpoint: string;

  switch (provider) {
    case 'datadog': {
      const host = env.DD_AGENT_HOST || 'datadog-agent';
      const port = env.DD_OTLP_HTTP_PORT || '4318';
      tracesEndpoint = `http://${host}:${port}/v1/traces`;
      break;
    }
    case 'newrelic': {
      const region = (env.NEW_RELIC_REGION || 'us').toLowerCase();
      tracesEndpoint = NEW_RELIC_ENDPOINTS[region] ?? NEW_RELIC_ENDPOINTS.us;
      if (env.NEW_RELIC_LICENSE_KEY) {
        headers['api-key'] = env.NEW_RELIC_LICENSE_KEY;
      }
      break;
    }
    default:
      tracesEndpoint = 'http://localhost:4318/v1/traces';
  }

  if (env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT) {
    tracesEndpoint = env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT;
  }

  return {
    provider,
    tracesEndpoint,
    headers,
    serviceName: env.OTEL_SERVICE_NAME || env.DD_SERVICE || 'chioma-backend',
    serviceVersion: env.APP_VERSION || env.DD_VERSION || 'unknown',
    environment: env.DD_ENV || env.NODE_ENV || 'development',
  };
}
