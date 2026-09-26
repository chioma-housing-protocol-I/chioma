import {
  PoolConfigValidator,
  PoolConfig,
  PoolValidationResult,
} from './pool-config.validator';

describe('PoolConfigValidator', () => {
  let validator: PoolConfigValidator;

  beforeEach(() => {
    validator = new PoolConfigValidator();
  });

  describe('validate', () => {
    describe('valid configurations', () => {
      it('should accept typical production configuration', () => {
        const config: PoolConfig = {
          min: 20,
          max: 50,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        };

        const result = validator.validate(config);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.warnings).toHaveLength(0);
      });

      it('should accept development configuration', () => {
        const config: PoolConfig = {
          min: 2,
          max: 5,
          idleTimeoutMillis: 60000,
          connectionTimeoutMillis: 5000,
        };

        const result = validator.validate(config);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should accept high throughput configuration', () => {
        const config: PoolConfig = {
          min: 30,
          max: 100,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        };

        const result = validator.validate(config);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('invalid min/max connections', () => {
      it('should reject min < 1', () => {
        const config: PoolConfig = {
          min: 0,
          max: 10,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        };

        const result = validator.validate(config);

        expect(result.isValid).toBe(false);
        expect(result.errors[0]).toContain('min connections must be >= 1');
      });

      it('should reject max < 1', () => {
        const config: PoolConfig = {
          min: 1,
          max: 0,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        };

        const result = validator.validate(config);

        expect(result.isValid).toBe(false);
        expect(result.errors[0]).toContain('max connections must be >= 1');
      });

      it('should reject min > max', () => {
        const config: PoolConfig = {
          min: 50,
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        };

        const result = validator.validate(config);

        expect(result.isValid).toBe(false);
        expect(
          result.errors.some((e) =>
            e.includes('min cannot be greater than max'),
          ),
        ).toBe(true);
      });

      it('should reject max > 500', () => {
        const config: PoolConfig = {
          min: 1,
          max: 501,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        };

        const result = validator.validate(config);

        expect(result.isValid).toBe(false);
        expect(result.errors[0]).toContain('exceeds safe limit');
      });
    });

    describe('suspicious pool sizes - warnings', () => {
      it('should warn if max > 200', () => {
        const config: PoolConfig = {
          min: 10,
          max: 250,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        };

        const result = validator.validate(config);

        expect(result.isValid).toBe(true);
        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.warnings[0]).toContain('very high');
      });

      it('should warn if min equals max', () => {
        const config: PoolConfig = {
          min: 50,
          max: 50,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        };

        const result = validator.validate(config);

        expect(result.isValid).toBe(true);
        expect(result.warnings[0]).toContain('min equals max');
      });

      it('should warn if min-max range is too narrow', () => {
        const config: PoolConfig = {
          min: 8,
          max: 9,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        };

        const result = validator.validate(config);

        expect(result.isValid).toBe(true);
        expect(result.warnings[0]).toContain('very narrow');
      });

      it('should not warn if min-max range is narrow for small pools', () => {
        const config: PoolConfig = {
          min: 2,
          max: 3,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        };

        const result = validator.validate(config);

        // Should not have narrow range warning (max <= 5)
        expect(
          result.warnings.filter((w) => w.includes('narrow')),
        ).toHaveLength(0);
      });
    });

    describe('idle timeout validation', () => {
      it('should warn if idle timeout < 5000ms', () => {
        const config: PoolConfig = {
          min: 10,
          max: 20,
          idleTimeoutMillis: 1000,
          connectionTimeoutMillis: 2000,
        };

        const result = validator.validate(config);

        expect(result.isValid).toBe(true);
        expect(result.warnings[0]).toContain('very short');
      });

      it('should warn if idle timeout > 300000ms', () => {
        const config: PoolConfig = {
          min: 10,
          max: 20,
          idleTimeoutMillis: 400000,
          connectionTimeoutMillis: 2000,
        };

        const result = validator.validate(config);

        expect(result.isValid).toBe(true);
        expect(result.warnings[0]).toContain('very long');
      });

      it('should accept reasonable idle timeout (30s)', () => {
        const config: PoolConfig = {
          min: 10,
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        };

        const result = validator.validate(config);

        expect(result.warnings.filter((w) => w.includes('idle'))).toHaveLength(
          0,
        );
      });
    });

    describe('connection timeout validation', () => {
      it('should warn if connection timeout < 500ms', () => {
        const config: PoolConfig = {
          min: 10,
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 100,
        };

        const result = validator.validate(config);

        expect(result.isValid).toBe(true);
        expect(result.warnings[0]).toContain('very short');
      });

      it('should warn if connection timeout > 30000ms', () => {
        const config: PoolConfig = {
          min: 10,
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 40000,
        };

        const result = validator.validate(config);

        expect(result.isValid).toBe(true);
        expect(result.warnings[0]).toContain('very long');
      });

      it('should accept reasonable connection timeout (2s)', () => {
        const config: PoolConfig = {
          min: 10,
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        };

        const result = validator.validate(config);

        expect(
          result.warnings.filter((w) => w.includes('Connection timeout')),
        ).toHaveLength(0);
      });
    });
  });

  describe('getWorkloadRecommendation', () => {
    it('should return development recommendation', () => {
      const rec = validator.getWorkloadRecommendation('development');

      expect(rec).toBeDefined();
      expect(rec?.minConnections).toBe(2);
      expect(rec?.maxConnections).toBe(5);
      expect(rec?.name).toBe('Development');
    });

    it('should return production recommendation', () => {
      const rec = validator.getWorkloadRecommendation('production');

      expect(rec).toBeDefined();
      expect(rec?.minConnections).toBe(20);
      expect(rec?.maxConnections).toBe(50);
      expect(rec?.name).toBe('Production');
    });

    it('should return high-throughput recommendation', () => {
      const rec = validator.getWorkloadRecommendation('high-throughput');

      expect(rec).toBeDefined();
      expect(rec?.maxConnections).toBe(100);
    });

    it('should return null for unknown workload', () => {
      const rec = validator.getWorkloadRecommendation('unknown');

      expect(rec).toBeNull();
    });
  });

  describe('listWorkloadRecommendations', () => {
    it('should return all workload recommendations', () => {
      const recommendations = validator.listWorkloadRecommendations();

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some((r) => r.name === 'Development')).toBe(true);
      expect(recommendations.some((r) => r.name === 'Production')).toBe(true);
    });

    it('should include all required fields in recommendations', () => {
      const recommendations = validator.listWorkloadRecommendations();

      recommendations.forEach((rec) => {
        expect(rec.name).toBeDefined();
        expect(rec.minConnections).toBeGreaterThan(0);
        expect(rec.maxConnections).toBeGreaterThanOrEqual(rec.minConnections);
        expect(rec.idleTimeoutMs).toBeGreaterThan(0);
        expect(rec.connectionTimeoutMs).toBeGreaterThan(0);
      });
    });
  });

  describe('validateAndLog', () => {
    it('should not throw in non-strict mode for valid config', () => {
      const config: PoolConfig = {
        min: 10,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      };

      expect(() => {
        // Suppress logger output
        const logger = new (require('@nestjs/common').Logger)();
        jest.spyOn(logger, 'log').mockImplementation(() => {});
        jest.spyOn(logger, 'warn').mockImplementation(() => {});
        jest.spyOn(logger, 'error').mockImplementation(() => {});
        validator.validateAndLog(config, false);
      }).not.toThrow();
    });

    it('should throw in strict mode for invalid config', () => {
      const config: PoolConfig = {
        min: 50,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      };

      expect(() => validator.validateAndLog(config, true)).toThrow();
    });

    it('should not throw in strict mode for valid config', () => {
      const config: PoolConfig = {
        min: 20,
        max: 50,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      };

      expect(() => {
        const logger = new (require('@nestjs/common').Logger)();
        jest.spyOn(logger, 'log').mockImplementation(() => {});
        jest.spyOn(logger, 'warn').mockImplementation(() => {});
        validator.validateAndLog(config, true);
      }).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle minimum viable pool (1 connection)', () => {
      const config: PoolConfig = {
        min: 1,
        max: 1,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      };

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      // But should have warning about no flexibility
      expect(result.warnings.some((w) => w.includes('equals max'))).toBe(true);
    });

    it('should handle very large valid pool (200 connections)', () => {
      const config: PoolConfig = {
        min: 100,
        max: 200,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      };

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      // 200 is not > 200, so no warning for max > 200
      // But min-max range narrow warning should apply
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
});
