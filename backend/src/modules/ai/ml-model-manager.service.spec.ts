import { Test, TestingModule } from '@nestjs/testing';
import { MlModelManagerService } from './ml-model-manager.service';

describe('MlModelManagerService', () => {
  let service: MlModelManagerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MlModelManagerService],
    }).compile();

    service = module.get<MlModelManagerService>(MlModelManagerService);
  });

  describe('listModels', () => {
    it('returns the registered models', () => {
      const models = service.listModels();

      expect(models).toHaveLength(2);
      expect(models.map((m) => m.name)).toEqual([
        'fraud-risk-v1',
        'property-recommendation-v1',
      ]);
      expect(models.every((m) => m.enabled)).toBe(true);
    });
  });

  describe('getModel', () => {
    it('returns the model metadata when the name matches', () => {
      const model = service.getModel('fraud-risk-v1');

      expect(model).toEqual({
        name: 'fraud-risk-v1',
        version: '1.0.0',
        type: 'fraud',
        enabled: true,
      });
    });

    it('returns undefined when no model matches the name', () => {
      const model = service.getModel('does-not-exist');

      expect(model).toBeUndefined();
    });

    it('is case-sensitive on the model name', () => {
      const model = service.getModel('FRAUD-RISK-V1');

      expect(model).toBeUndefined();
    });
  });
});
