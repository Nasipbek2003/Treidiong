/**
 * Tests for Validation Utilities
 */

import { validateCandlestick, validateCandlesticks } from './validation';
import { Candlestick } from './types';

describe('Validation Utilities', () => {
  describe('validateCandlestick', () => {
    it('should validate a correct candlestick', () => {
      const candle: Candlestick = {
        timestamp: Date.now(),
        open: 100,
        high: 105,
        low: 95,
        close: 102,
        volume: 1000,
      };

      const result = validateCandlestick(candle);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject candlestick with high < low', () => {
      const candle: Candlestick = {
        timestamp: Date.now(),
        open: 100,
        high: 95,
        low: 105,
        close: 100,
        volume: 1000,
      };

      const result = validateCandlestick(candle);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('high cannot be less than low');
    });

    it('should reject candlestick with close > high', () => {
      const candle: Candlestick = {
        timestamp: Date.now(),
        open: 100,
        high: 105,
        low: 95,
        close: 110,
        volume: 1000,
      };

      const result = validateCandlestick(candle);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('close must be within high-low range (close > high)');
    });

    it('should reject candlestick with close < low', () => {
      const candle: Candlestick = {
        timestamp: Date.now(),
        open: 100,
        high: 105,
        low: 95,
        close: 90,
        volume: 1000,
      };

      const result = validateCandlestick(candle);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('close must be within high-low range (close < low)');
    });

    it('should reject candlestick with open > high', () => {
      const candle: Candlestick = {
        timestamp: Date.now(),
        open: 110,
        high: 105,
        low: 95,
        close: 100,
        volume: 1000,
      };

      const result = validateCandlestick(candle);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('open must be within high-low range (open > high)');
    });

    it('should reject candlestick with open < low', () => {
      const candle: Candlestick = {
        timestamp: Date.now(),
        open: 90,
        high: 105,
        low: 95,
        close: 100,
        volume: 1000,
      };

      const result = validateCandlestick(candle);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('open must be within high-low range (open < low)');
    });

    it('should reject candlestick with negative values', () => {
      const candle: Candlestick = {
        timestamp: Date.now(),
        open: -100,
        high: 105,
        low: -95,
        close: 100,
        volume: -1000,
      };

      const result = validateCandlestick(candle);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('open cannot be negative');
      expect(result.errors).toContain('low cannot be negative');
      expect(result.errors).toContain('volume cannot be negative');
    });

    it('should reject candlestick with NaN values', () => {
      const candle: Candlestick = {
        timestamp: NaN,
        open: NaN,
        high: 105,
        low: 95,
        close: 100,
        volume: 1000,
      };

      const result = validateCandlestick(candle);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('timestamp must be a valid number');
      expect(result.errors).toContain('open must be a valid number');
    });

    it('should reject candlestick with all NaN values', () => {
      const candle: Candlestick = {
        timestamp: NaN,
        open: NaN,
        high: NaN,
        low: NaN,
        close: NaN,
        volume: NaN,
      };

      const result = validateCandlestick(candle);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('timestamp must be a valid number');
      expect(result.errors).toContain('open must be a valid number');
      expect(result.errors).toContain('high must be a valid number');
      expect(result.errors).toContain('low must be a valid number');
      expect(result.errors).toContain('close must be a valid number');
      expect(result.errors).toContain('volume must be a valid number');
    });

    it('should reject candlestick with null values', () => {
      const candle: any = {
        timestamp: null,
        open: null,
        high: null,
        low: null,
        close: null,
        volume: null,
      };

      const result = validateCandlestick(candle);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('timestamp is required');
      expect(result.errors).toContain('open is required');
      expect(result.errors).toContain('high is required');
      expect(result.errors).toContain('low is required');
      expect(result.errors).toContain('close is required');
      expect(result.errors).toContain('volume is required');
    });

    it('should reject candlestick with undefined values', () => {
      const candle: any = {
        timestamp: undefined,
        open: undefined,
        high: undefined,
        low: undefined,
        close: undefined,
        volume: undefined,
      };

      const result = validateCandlestick(candle);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('timestamp is required');
      expect(result.errors).toContain('open is required');
      expect(result.errors).toContain('high is required');
      expect(result.errors).toContain('low is required');
      expect(result.errors).toContain('close is required');
      expect(result.errors).toContain('volume is required');
    });

    it('should reject candlestick with all negative values', () => {
      const candle: Candlestick = {
        timestamp: Date.now(),
        open: -100,
        high: -95,
        low: -105,
        close: -100,
        volume: -1000,
      };

      const result = validateCandlestick(candle);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('open cannot be negative');
      expect(result.errors).toContain('high cannot be negative');
      expect(result.errors).toContain('low cannot be negative');
      expect(result.errors).toContain('close cannot be negative');
      expect(result.errors).toContain('volume cannot be negative');
    });

    it('should accept candlestick with close = high', () => {
      const candle: Candlestick = {
        timestamp: Date.now(),
        open: 100,
        high: 105,
        low: 95,
        close: 105,
        volume: 1000,
      };

      const result = validateCandlestick(candle);
      expect(result.isValid).toBe(true);
    });

    it('should accept candlestick with close = low', () => {
      const candle: Candlestick = {
        timestamp: Date.now(),
        open: 100,
        high: 105,
        low: 95,
        close: 95,
        volume: 1000,
      };

      const result = validateCandlestick(candle);
      expect(result.isValid).toBe(true);
    });

    it('should accept candlestick with open = high', () => {
      const candle: Candlestick = {
        timestamp: Date.now(),
        open: 105,
        high: 105,
        low: 95,
        close: 100,
        volume: 1000,
      };

      const result = validateCandlestick(candle);
      expect(result.isValid).toBe(true);
    });

    it('should accept candlestick with open = low', () => {
      const candle: Candlestick = {
        timestamp: Date.now(),
        open: 95,
        high: 105,
        low: 95,
        close: 100,
        volume: 1000,
      };

      const result = validateCandlestick(candle);
      expect(result.isValid).toBe(true);
    });

    it('should accept candlestick with volume = 0', () => {
      const candle: Candlestick = {
        timestamp: Date.now(),
        open: 100,
        high: 105,
        low: 95,
        close: 100,
        volume: 0,
      };

      const result = validateCandlestick(candle);
      expect(result.isValid).toBe(true);
    });

    it('should accept doji candlestick (open = close = high = low)', () => {
      const candle: Candlestick = {
        timestamp: Date.now(),
        open: 100,
        high: 100,
        low: 100,
        close: 100,
        volume: 1000,
      };

      const result = validateCandlestick(candle);
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateCandlesticks', () => {
    it('should validate an array of correct candlesticks', () => {
      const candles: Candlestick[] = [
        {
          timestamp: 1000,
          open: 100,
          high: 105,
          low: 95,
          close: 102,
          volume: 1000,
        },
        {
          timestamp: 2000,
          open: 102,
          high: 108,
          low: 100,
          close: 105,
          volume: 1200,
        },
      ];

      const result = validateCandlesticks(candles);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty array', () => {
      const result = validateCandlesticks([]);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('candles array cannot be empty');
    });

    it('should reject non-array input', () => {
      const result = validateCandlesticks(null as any);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('candles must be an array');
    });

    it('should reject array with invalid candlestick', () => {
      const candles: Candlestick[] = [
        {
          timestamp: 1000,
          open: 100,
          high: 105,
          low: 95,
          close: 102,
          volume: 1000,
        },
        {
          timestamp: 2000,
          open: 102,
          high: 95, // Invalid: high < low
          low: 100,
          close: 105,
          volume: 1200,
        },
      ];

      const result = validateCandlesticks(candles);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Candle 1'))).toBe(true);
    });

    it('should reject array with non-chronological timestamps', () => {
      const candles: Candlestick[] = [
        {
          timestamp: 2000,
          open: 100,
          high: 105,
          low: 95,
          close: 102,
          volume: 1000,
        },
        {
          timestamp: 1000, // Earlier than previous
          open: 102,
          high: 108,
          low: 100,
          close: 105,
          volume: 1200,
        },
      ];

      const result = validateCandlesticks(candles);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('chronological order'))).toBe(true);
    });

    it('should accept array with equal timestamps', () => {
      const candles: Candlestick[] = [
        {
          timestamp: 1000,
          open: 100,
          high: 105,
          low: 95,
          close: 102,
          volume: 1000,
        },
        {
          timestamp: 1000, // Same timestamp
          open: 102,
          high: 108,
          low: 100,
          close: 105,
          volume: 1200,
        },
      ];

      const result = validateCandlesticks(candles);
      expect(result.isValid).toBe(true);
    });

    it('should report multiple errors', () => {
      const candles: Candlestick[] = [
        {
          timestamp: NaN,
          open: -100,
          high: 105,
          low: 95,
          close: 102,
          volume: 1000,
        },
        {
          timestamp: 2000,
          open: 102,
          high: 95,
          low: 100,
          close: 105,
          volume: -1200,
        },
      ];

      const result = validateCandlesticks(candles);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(2);
    });
  });
});
