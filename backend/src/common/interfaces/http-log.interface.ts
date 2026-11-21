export interface HttpLog {
  timestamp: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  method: string;
  url: string;
  statusCode: number;
  responseTime: number;
  ip?: string;
  userAgent?: string;
  correlationId?: string;
  requestHeaders?: Record<string, any>;
  requestBody?: any;
  responseHeaders?: Record<string, any>;
  responseBody?: any;
  responseSize?: number | string;
}
