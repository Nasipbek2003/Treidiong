/**
 * Liquidity Engine - Configuration
 * 
 * Default configuration values and configuration management for the Liquidity Engine.
 */

import { LiquidityConfig, ValidationResult } from './types';

/**
 * Default configuration for the Liquidity Engine
 */
export const DEFAULT_CONFIG: Readonly<LiquidityConfig> = Object.freeze({
  // Tolerance for Equal Highs/Lows (0.1%)
  equalTolerance: 0.001,

  // Minimum wick size for sweep detection (50%)
  minWickSize: 0.5,

  // Volume spike multiplier for breakout validation
  volumeSpikeMultiplier: 1.5,

  // Score weights for signal evaluation
  scoreWeights: Object.freeze({
    sweep: 25,
    bos: 30,
    divergence: 15,
    volume: 10,
    htf: 20,
  }),

  // Higher timeframes for HTF analysis
  htfTimeframes: Object.freeze(['1d', '1w']),

  // Minimum number of touches for Range High/Low detection
  minRangeTouches: 3,

  // Lookback period for swing point identification
  swingLookback: 20,
});

/**
 * Validates a configuration object
 * 
 * @param config - Configuration to validate
 * @returns Validation result with errors if any
 */
export function validateConfig(config: Partial<LiquidityConfig>): ValidationResult {
  const errors: string[] = [];

  // Validate equalTolerance
  if (config.equalTolerance !== undefined) {
    if (config.equalTolerance < 0) {
      errors.push('equalTolerance must be non-negative');
    }
    if (config.equalTolerance > 1) {
      errors.push('equalTolerance must be <= 1 (100%)');
    }
    if (isNaN(config.equalTolerance)) {
      errors.push('equalTolerance must be a valid number');
    }
  }

  // Validate minWickSize
  if (config.minWickSize !== undefined) {
    if (config.minWickSize < 0 || config.minWickSize > 1) {
      errors.push('minWickSize must be between 0 and 1');
    }
    if (isNaN(config.minWickSize)) {
      errors.push('minWickSize must be a valid number');
    }
  }

  // Validate volumeSpikeMultiplier
  if (config.volumeSpikeMultiplier !== undefined) {
    if (config.volumeSpikeMultiplier < 1) {
      errors.push('volumeSpikeMultiplier must be >= 1');
    }
    if (isNaN(config.volumeSpikeMultiplier)) {
      errors.push('volumeSpikeMultiplier must be a valid number');
    }
  }

  // Validate scoreWeights
  if (config.scoreWeights !== undefined) {
    const weights = config.scoreWeights;
    
    if (weights.sweep !== undefined && (weights.sweep < 0 || isNaN(weights.sweep))) {
      errors.push('scoreWeights.sweep must be non-negative');
    }
    if (weights.bos !== undefined && (weights.bos < 0 || isNaN(weights.bos))) {
      errors.push('scoreWeights.bos must be non-negative');
    }
    if (weights.divergence !== undefined && (weights.divergence < 0 || isNaN(weights.divergence))) {
      errors.push('scoreWeights.divergence must be non-negative');
    }
    if (weights.volume !== undefined && (weights.volume < 0 || isNaN(weights.volume))) {
      errors.push('scoreWeights.volume must be non-negative');
    }
    if (weights.htf !== undefined && (weights.htf < 0 || isNaN(weights.htf))) {
      errors.push('scoreWeights.htf must be non-negative');
    }
  }

  // Validate htfTimeframes
  if (config.htfTimeframes !== undefined) {
    if (!Array.isArray(config.htfTimeframes)) {
      errors.push('htfTimeframes must be an array');
    } else if (config.htfTimeframes.length === 0) {
      errors.push('htfTimeframes must not be empty');
    }
  }

  // Validate minRangeTouches
  if (config.minRangeTouches !== undefined) {
    if (config.minRangeTouches < 2) {
      errors.push('minRangeTouches must be >= 2');
    }
    if (!Number.isInteger(config.minRangeTouches)) {
      errors.push('minRangeTouches must be an integer');
    }
  }

  // Validate swingLookback
  if (config.swingLookback !== undefined) {
    if (config.swingLookback < 1) {
      errors.push('swingLookback must be >= 1');
    }
    if (!Number.isInteger(config.swingLookback)) {
      errors.push('swingLookback must be an integer');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Loads and merges custom configuration with defaults
 * 
 * @param customConfig - Partial configuration to override defaults
 * @returns Complete configuration with validated values
 * @throws Error if configuration is invalid
 */
export function loadConfig(customConfig?: Partial<LiquidityConfig>): LiquidityConfig {
  if (!customConfig) {
    return {
      ...DEFAULT_CONFIG,
      scoreWeights: { ...DEFAULT_CONFIG.scoreWeights },
      htfTimeframes: [...DEFAULT_CONFIG.htfTimeframes],
    };
  }

  // Validate custom configuration
  const validation = validateConfig(customConfig);
  if (!validation.isValid) {
    throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
  }

  // Merge with defaults
  return {
    equalTolerance: customConfig.equalTolerance ?? DEFAULT_CONFIG.equalTolerance,
    minWickSize: customConfig.minWickSize ?? DEFAULT_CONFIG.minWickSize,
    volumeSpikeMultiplier: customConfig.volumeSpikeMultiplier ?? DEFAULT_CONFIG.volumeSpikeMultiplier,
    scoreWeights: {
      sweep: customConfig.scoreWeights?.sweep ?? DEFAULT_CONFIG.scoreWeights.sweep,
      bos: customConfig.scoreWeights?.bos ?? DEFAULT_CONFIG.scoreWeights.bos,
      divergence: customConfig.scoreWeights?.divergence ?? DEFAULT_CONFIG.scoreWeights.divergence,
      volume: customConfig.scoreWeights?.volume ?? DEFAULT_CONFIG.scoreWeights.volume,
      htf: customConfig.scoreWeights?.htf ?? DEFAULT_CONFIG.scoreWeights.htf,
    },
    htfTimeframes: customConfig.htfTimeframes ? [...customConfig.htfTimeframes] : [...DEFAULT_CONFIG.htfTimeframes],
    minRangeTouches: customConfig.minRangeTouches ?? DEFAULT_CONFIG.minRangeTouches,
    swingLookback: customConfig.swingLookback ?? DEFAULT_CONFIG.swingLookback,
  };
}
