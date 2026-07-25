export enum AlertSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  WARNING = 'warning',
  MEDIUM = 'medium',
  INFO = 'info',
}

export enum EscalationTier {
  ONCALL = 1,
  TEAM = 2,
  MANAGEMENT = 3,
}

export interface AlertPayload {
  status: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  startsAt: string;
  endsAt?: string;
  generatorURL: string;
}

export interface TrackedAlert {
  fingerprint: string;
  alert: AlertPayload;
  severity: AlertSeverity;
  firstFiredAt: Date;
  lastEscalationTier: EscalationTier;
}

export interface HealthDegradationPayload {
  status: 'warning' | 'error';
  summary: string;
  services: Record<string, unknown>;
}
