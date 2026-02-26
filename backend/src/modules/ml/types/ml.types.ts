export enum ModelType {
  FRAUD_DETECTION = 'fraud_detection',
  RECOMMENDATION = 'recommendation',
  RISK_ASSESSMENT = 'risk_assessment',
  SENTIMENT_ANALYSIS = 'sentiment_analysis',
  IMAGE_CLASSIFICATION = 'image_classification',
}

export enum ModelStatus {
  LOADING = 'loading',
  READY = 'ready',
  ERROR = 'error',
  UPDATING = 'updating',
}

export interface ModelMetadata {
  id: string;
  name: string;
  version: string;
  type: ModelType;
  status: ModelStatus;
  accuracy?: number;
  lastUpdated: Date;
  loadedAt?: Date;
  framework?: string;
  description?: string;
}

export interface PredictionRequest {
  modelType: ModelType;
  input: any;
  userId?: string;
  requestId?: string;
}

export interface PredictionResponse<T = any> {
  prediction: T;
  confidence: number;
  modelVersion: string;
  processingTime: number;
  cached: boolean;
}

export interface ModelPerformanceMetrics {
  totalPredictions: number;
  averageLatency: number;
  cacheHitRate: number;
  errorRate: number;
  lastEvaluationDate?: Date;
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
}
