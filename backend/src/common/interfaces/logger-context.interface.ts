export interface LoggerContext {
  requestId?: string;
  correlationId?: string;
  userId?: string;
  traceId?: string;
  [key: string]: any;
}
