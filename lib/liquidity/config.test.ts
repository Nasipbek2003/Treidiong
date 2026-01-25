/**
 * Tests for Liquidity Engine Configuration
 */

import { DEFAULT_CONFIG, validateConfig, loadConfig } from './config';
import { LiquidityConfig } from './types';

describe('Liquidity Engine Configuration', () => {
  describe('DEFAULT_CONFIG', () => {
    it('should have all required fields', () => {
      expect(DEFAULT_CONFIG.equalTolerance).toBe(0.001);
      expect(DEFAULT_CONFIG.minWickSize).toBe(0.5);
      expect(DEFAULT_CONFIG.volumeSpikeMultiplier).toBe(1.5);
      expect(DEFAULT_CONFIG.scoreWeights).toBeDefined();
      expect(DEFAULT_CONFIG.htfTimeframes).toEqual(['1d', '1w']);
      expect(DEFAULT_CONFIG.minRangeTouches).toBe(3);
      expect(DEFAULT_CONFIG.swingLookback).toBe(20);
    });

    it('should have valid score weights', () => {
      const weights = DEFAULT_CONFIG.scoreWeights;
      expect(weights.sweep).toBe(25);
      expect(weights.bos).toBe(30);
      expect(weights.divergence).toBe(15);
      expect(weights.volume).toBe(10);
      expect(weights.htf).toBe(20);
    });

    it('should be immutable', () => {
      expect(Object.isFrozen(DEFAULT_CONFIG)).toBe(true);
      expect(Object.isFrozen(DEFAULT_CONFIG.scoreWeights)).toBe(true);
      expect(Object.isFrozen(DEFAULT_CONFIG.htfTimeframes)).toBe(true);
    });
  });

  describe('validateConfig', () => {
    it('should validate a correct configuration', () => {
      const result = validateConfig(DEFAULT_CONFIG);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject negative equalTolerance', () => {
      const result = validateConfig({ equalTolerance: -0.1 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('equalTolerance must be non-negative');
    });

    it('should reject equalTolerance > 1', () => {
      const result = validateConfig({ equalTolerance: 1.5 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('equalTolerance must be <= 1 (100%)');
    });

    it('should reject NaN equalTolerance', () => {
      const result = validateConfig({ equalTolerance: NaN });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('equalTolerance must be a valid number');
    });

    it('should reject minWickSize outside [0, 1]', () => {
      const result1 = validateConfig({ minWickSize: -0.1 });
      expect(result1.isValid).toBe(false);
      expect(result1.errors).toContain('minWickSize must be between 0 and 1');

      const result2 = validateConfig({ minWickSize: 1.5 });
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toContain('minWickSize must be between 0 and 1');
    });

    it('should reject volumeSpikeMultiplier < 1', () => {
      const result = validateConfig({ volumeSpikeMultiplier: 0.5 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('volumeSpikeMultiplier must be >= 1');
    });

    it('should reject negative score weights', () => {
      const result = validateConfig({
        scoreWeights: {
          sweep: -5,
          bos: 30,
          divergence: 15,
          volume: 10,
          htf: 20,
        },
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('scoreWeights.sweep must be non-negative');
    });

    it('should reject empty htfTimeframes', () => {
      const result = validateConfig({ htfTimeframes: [] });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('htfTimeframes must not be empty');
    });

    it('should reject minRangeTouches < 2', () => {
      const result = validateConfig({ minRangeTouches: 1 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('minRangeTouches must be >= 2');
    });

    it('should reject non-integer minRangeTouches', () => {
      const result = validateConfig({ minRangeTouches: 3.5 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('minRangeTouches must be an integer');
    });

    it('should reject swingLookback < 1', () => {
      const result = validateConfig({ swingLookback: 0 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('swingLookback must be >= 1');
    });

    it('should reject non-integer swingLookback', () => {
      const result = validateConfig({ swingLookback: 20.5 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('swingLookback must be an integer');
    });

    it('should accumulate multiple errors', () => {
      const result = validateConfig({
        equalTolerance: -0.1,
        minWickSize: 2,
        volumeSpikeMultiplier: 0.5,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('loadConfig', () => {
    it('should return default config when no custom config provided', () => {
      const config = loadConfig();
      expect(config.equalTolerance).toBe(DEFAULT_CONFIG.equalTolerance);
      expect(config.minWickSize).toBe(DEFAULT_CONFIG.minWickSize);
      expect(config.volumeSpikeMultiplier).toBe(DEFAULT_CONFIG.volumeSpikeMultiplier);
      expect(config.scoreWeights).toEqual(DEFAULT_CONFIG.scoreWeights);
      expect(config.htfTimeframes).toEqual(DEFAULT_CONFIG.htfTimeframes);
      expect(config.minRangeTouches).toBe(DEFAULT_CONFIG.minRangeTouches);
      expect(config.swingLookback).toBe(DEFAULT_CONFIG.swingLookback);
    });

    it('should return default config when undefined is provided', () => {
      const config = loadConfig(undefined);
      expect(config.equalTolerance).toBe(DEFAULT_CONFIG.equalTolerance);
      expect(config.minWickSize).toBe(DEFAULT_CONFIG.minWickSize);
      expect(config.volumeSpikeMultiplier).toBe(DEFAULT_CONFIG.volumeSpikeMultiplier);
      expect(config.scoreWeights).toEqual(DEFAULT_CONFIG.scoreWeights);
      expect(config.htfTimeframes).toEqual(DEFAULT_CONFIG.htfTimeframes);
      expect(config.minRangeTouches).toBe(DEFAULT_CONFIG.minRangeTouches);
      expect(config.swingLookback).toBe(DEFAULT_CONFIG.swingLookback);
    });

    it('should merge custom config with defaults', () => {
      const customConfig: Partial<LiquidityConfig> = {
        equalTolerance: 0.002,
        minWickSize: 0.6,
      };
      const config = loadConfig(customConfig);

      expect(config.equalTolerance).toBe(0.002);
      expect(config.minWickSize).toBe(0.6);
      expect(config.volumeSpikeMultiplier).toBe(DEFAULT_CONFIG.volumeSpikeMultiplier);
      expect(config.scoreWeights).toEqual(DEFAULT_CONFIG.scoreWeights);
    });

    it('should merge partial score weights with defaults', () => {
      const customConfig: Partial<LiquidityConfig> = {
        scoreWeights: {
          sweep: 30,
          bos: 30,
          divergence: 15,
          volume: 10,
          htf: 20,
        },
      };
      const config = loadConfig(customConfig);

      expect(config.scoreWeights.sweep).toBe(30);
      expect(config.scoreWeights.bos).toBe(30);
    });

    it('should throw error for invalid custom config', () => {
      const invalidConfig: Partial<LiquidityConfig> = {
        equalTolerance: -0.1,
      };

      expect(() => loadConfig(invalidConfig)).toThrow('Invalid configuration');
    });

    it('should handle all custom parameters', () => {
      const customConfig: LiquidityConfig = {
        equalTolerance: 0.002,
        minWickSize: 0.6,
        volumeSpikeMultiplier: 2.0,
        scoreWeights: {
          sweep: 30,
          bos: 25,
          divergence: 20,
          volume: 15,
          htf: 10,
        },
        htfTimeframes: ['4h', '1d', '1w'],
        minRangeTouches: 4,
        swingLookback: 30,
      };

      const config = loadConfig(customConfig);
      expect(config).toEqual(customConfig);
    });

    it('should not mutate the default config', () => {
      const originalDefault = {
        ...DEFAULT_CONFIG,
        scoreWeights: { ...DEFAULT_CONFIG.scoreWeights },
        htfTimeframes: [...DEFAULT_CONFIG.htfTimeframes],
      };
      loadConfig({ equalTolerance: 0.002 });
      expect(DEFAULT_CONFIG.equalTolerance).toBe(originalDefault.equalTolerance);
      expect(DEFAULT_CONFIG.scoreWeights).toEqual(originalDefault.scoreWeights);
      expect(DEFAULT_CONFIG.htfTimeframes).toEqual(originalDefault.htfTimeframes);
    });

    it('should create a new array for htfTimeframes', () => {
      const config = loadConfig();
      config.htfTimeframes.push('1M');
      expect(DEFAULT_CONFIG.htfTimeframes).toEqual(['1d', '1w']);
    });
  });

  describe('Edge Cases', () => {
    it('should accept equalTolerance of 0', () => {
      const result = validateConfig({ equalTolerance: 0 });
      expect(result.isValid).toBe(true);
    });

    it('should accept equalTolerance of 1', () => {
      const result = validateConfig({ equalTolerance: 1 });
      expect(result.isValid).toBe(true);
    });

    it('should accept minWickSize of 0', () => {
      const result = validateConfig({ minWickSize: 0 });
      expect(result.isValid).toBe(true);
    });

    it('should accept minWickSize of 1', () => {
      const result = validateConfig({ minWickSize: 1 });
      expect(result.isValid).toBe(true);
    });

    it('should accept volumeSpikeMultiplier of exactly 1', () => {
      const result = validateConfig({ volumeSpikeMultiplier: 1 });
      expect(result.isValid).toBe(true);
    });

    it('should accept minRangeTouches of 2', () => {
      const result = validateConfig({ minRangeTouches: 2 });
      expect(result.isValid).toBe(true);
    });

    it('should accept swingLookback of 1', () => {
      const result = validateConfig({ swingLookback: 1 });
      expect(result.isValid).toBe(true);
    });

    it('should accept score weights of 0', () => {
      const result = validateConfig({
        scoreWeights: {
          sweep: 0,
          bos: 0,
          divergence: 0,
          volume: 0,
          htf: 0,
        },
      });
      expect(result.isValid).toBe(true);
    });

    it('should reject NaN minWickSize', () => {
      const result = validateConfig({ minWickSize: NaN });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('minWickSize must be a valid number');
    });

    it('should reject NaN volumeSpikeMultiplier', () => {
      const result = validateConfig({ volumeSpikeMultiplier: NaN });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('volumeSpikeMultiplier must be a valid number');
    });

    it('should reject NaN score weights', () => {
      const result = validateConfig({
        scoreWeights: {
          sweep: NaN,
          bos: NaN,
          divergence: NaN,
          volume: NaN,
          htf: NaN,
        },
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject non-array htfTimeframes', () => {
      const result = validateConfig({ htfTimeframes: 'not-an-array' as any });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('htfTimeframes must be an array');
    });
  });
});
