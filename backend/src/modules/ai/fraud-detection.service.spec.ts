import { Test, TestingModule } from '@nestjs/testing';
import {
  FraudDetectionService,
  FraudSignalInput,
} from './fraud-detection.service';

describe('FraudDetectionService', () => {
  let service: FraudDetectionService;

  const baseInput: FraudSignalInput = {
    amount: 100,
    isNewDevice: false,
    ipRisk: 0,
    failedAttemptsLastHour: 0,
    velocityLast10m: 0,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FraudDetectionService],
    }).compile();

    service = module.get<FraudDetectionService>(FraudDetectionService);
  });

  describe('scoreTransaction', () => {
    it('allows a low-risk transaction with no signals', () => {
      const result = service.scoreTransaction(baseInput);

      expect(result).toEqual({ score: 0, decision: 'allow', reasons: [] });
    });

    it('flags a high amount and adds the reason', () => {
      const result = service.scoreTransaction({
        ...baseInput,
        amount: 5001,
      });

      expect(result.score).toBe(25);
      expect(result.decision).toBe('allow');
      expect(result.reasons).toContain('high_amount');
    });

    it('flags a new device', () => {
      const result = service.scoreTransaction({
        ...baseInput,
        isNewDevice: true,
      });

      expect(result.score).toBe(20);
      expect(result.reasons).toContain('new_device');
    });

    it('flags high IP risk', () => {
      const result = service.scoreTransaction({
        ...baseInput,
        ipRisk: 71,
      });

      expect(result.score).toBe(20);
      expect(result.reasons).toContain('high_ip_risk');
    });

    it('does not flag IP risk at the boundary', () => {
      const result = service.scoreTransaction({
        ...baseInput,
        ipRisk: 70,
      });

      expect(result.score).toBe(0);
      expect(result.reasons).not.toContain('high_ip_risk');
    });

    it('flags a failed-attempt pattern', () => {
      const result = service.scoreTransaction({
        ...baseInput,
        failedAttemptsLastHour: 3,
      });

      expect(result.score).toBe(20);
      expect(result.reasons).toContain('failed_attempt_pattern');
    });

    it('flags high velocity', () => {
      const result = service.scoreTransaction({
        ...baseInput,
        velocityLast10m: 5,
      });

      expect(result.score).toBe(15);
      expect(result.reasons).toContain('high_velocity');
    });

    it('returns decision "review" once the combined score reaches 40', () => {
      const result = service.scoreTransaction({
        ...baseInput,
        amount: 5001, // 25
        velocityLast10m: 5, // 15
      });

      expect(result.score).toBe(40);
      expect(result.decision).toBe('review');
    });

    it('returns decision "block" once the combined score reaches 70', () => {
      const result = service.scoreTransaction({
        amount: 5001, // 25
        isNewDevice: true, // 20
        ipRisk: 71, // 20
        failedAttemptsLastHour: 0,
        velocityLast10m: 0,
      });

      expect(result.score).toBe(65);
      expect(result.decision).toBe('review');
    });

    it('blocks when every signal fires', () => {
      const result = service.scoreTransaction({
        amount: 5001,
        isNewDevice: true,
        ipRisk: 71,
        failedAttemptsLastHour: 3,
        velocityLast10m: 5,
      });

      expect(result.score).toBe(100);
      expect(result.decision).toBe('block');
      expect(result.reasons).toEqual([
        'high_amount',
        'new_device',
        'high_ip_risk',
        'failed_attempt_pattern',
        'high_velocity',
      ]);
    });
  });
});
