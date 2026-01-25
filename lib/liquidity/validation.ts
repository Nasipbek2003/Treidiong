/**
 * Liquidity Engine - Validation Utilities
 * 
 * Validation functions for input data (candlesticks, pools, etc.)
 */

import { Candlestick, ValidationResult } from './types';

/**
 * Validates a single candlestick for correctness
 * 
 * @param candle - Candlestick to validate
 * @returns Validation result with errors if any
 */
export function validateCandlestick(candle: Candlestick): ValidationResult {
  const errors: string[] = [];

  // Check for null/undefined values
  if (candle.timestamp === null || candle.timestamp === undefined) {
    errors.push('timestamp is required');
  }
  if (candle.open === null || candle.open === undefined) {
    errors.push('open is required');
  }
  if (candle.high === null || candle.high === undefined) {
    errors.push('high is required');
  }
  if (candle.low === null || candle.low === undefined) {
    errors.push('low is required');
  }
  if (candle.close === null || candle.close === undefined) {
    errors.push('close is required');
  }
  if (candle.volume === null || candle.volume === undefined) {
    errors.push('volume is required');
  }

  // Check for NaN values
  if (isNaN(candle.timestamp)) {
    errors.push('timestamp must be a valid number');
  }
  if (isNaN(candle.open)) {
    errors.push('open must be a valid number');
  }
  if (isNaN(candle.high)) {
    errors.push('high must be a valid number');
  }
  if (isNaN(candle.low)) {
    errors.push('low must be a valid number');
  }
  if (isNaN(candle.close)) {
    errors.push('close must be a valid number');
  }
  if (isNaN(candle.volume)) {
    errors.push('volume must be a valid number');
  }

  // Check for negative values
  if (candle.open < 0) {
    errors.push('open cannot be negative');
  }
  if (candle.high < 0) {
    errors.push('high cannot be negative');
  }
  if (candle.low < 0) {
    errors.push('low cannot be negative');
  }
  if (candle.close < 0) {
    errors.push('close cannot be negative');
  }
  if (candle.volume < 0) {
    errors.push('volume cannot be negative');
  }

  // Check OHLC relationships
  if (candle.high < candle.low) {
    errors.push('high cannot be less than low');
  }
  if (candle.close > candle.high) {
    errors.push('close must be within high-low range (close > high)');
  }
  if (candle.close < candle.low) {
    errors.push('close must be within high-low range (close < low)');
  }
  if (candle.open > candle.high) {
    errors.push('open must be within high-low range (open > high)');
  }
  if (candle.open < candle.low) {
    errors.push('open must be within high-low range (open < low)');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates an array of candlesticks
 * 
 * @param candles - Array of candlesticks to validate
 * @returns Validation result with errors if any
 */
export function validateCandlesticks(candles: Candlestick[]): ValidationResult {
  const errors: string[] = [];

  if (!Array.isArray(candles)) {
    errors.push('candles must be an array');
    return { isValid: false, errors };
  }

  if (candles.length === 0) {
    errors.push('candles array cannot be empty');
    return { isValid: false, errors };
  }

  // Validate each candlestick
  candles.forEach((candle, index) => {
    const validation = validateCandlestick(candle);
    if (!validation.isValid) {
      validation.errors.forEach((error) => {
        errors.push(`Candle ${index}: ${error}`);
      });
    }
  });

  // Check for chronological order
  for (let i = 1; i < candles.length; i++) {
    if (candles[i].timestamp < candles[i - 1].timestamp) {
      errors.push(`Candles must be in chronological order (candle ${i} timestamp < candle ${i - 1} timestamp)`);
      break; // Only report once
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
