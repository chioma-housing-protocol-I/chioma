import { Injectable } from '@nestjs/common';

export interface ModelMetadata {
  name: string;
  version: string;
  type: 'fraud' | 'recommendation' | 'analytics';
  enabled: boolean;
}

@Injectable()
export class MlModelManagerService {
  private readonly models: ModelMetadata[] = [
    { name: 'fraud-risk-v1', version: '1.0.0', type: 'fraud', enabled: true },
    {
      name: 'property-recommendation-v1',
      version: '1.0.0',
      type: 'recommendation',
      enabled: true,
    },
  ];

  listModels(): ModelMetadata[] {
    return this.models;
  }

  getModel(name: string): ModelMetadata | undefined {
    return this.models.find((model) => model.name === name);
  }
}
