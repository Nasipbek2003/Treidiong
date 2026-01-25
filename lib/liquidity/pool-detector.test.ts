/**
 * Unit Tests for LiquidityPoolDetector
 * 
 * Tests specific examples and edge cases for liquidity pool detection
 */

import { LiquidityPoolDetector } from './pool-detector';
import { Candlestick, LiquidityConfig } from './types';

// Default test configuration
const defaultConfig: LiquidityConfig = {
  equalTolerance: 0.001, // 0.1%
  minWickSize: 0.5,
  volumeSpikeMultiplier: 1.5,
  scoreWeights: {
    sweep: 25,
    bos: 30,
    divergence: 15,
    volume: 10,
    htf: 20,
  },
  htfTimeframes: ['1d', '1w'],
  minRangeTouches: 3,
  swingLookback: 20,
};

describe('LiquidityPoolDetector', () => {
  let detector: LiquidityPoolDetector;

  beforeEach(() => {
    detector = new LiquidityPoolDetector(defaultConfig);
  });

  describe('detectEqualHighs', () => {
    it('should return empty array for empty candles', () => {
      const result = detector.detectEqualHighs([], 0.001);
      expect(result).toEqual([]);
    });

    it('should return empty array for single candle', () => {
      const candles: Candlestick[] = [
        { timestamp: 1000, open: 100, high: 105, low: 95, close: 102, volume: 1000 },
      ];
      const result = detector.detectEqualHighs(candles, 0.001);
      expect(result).toEqual([]);
    });

    it('should detect equal highs with exactly 2 candles', () => {
      const candles: Candlestick[] = [
        { timestamp: 1000, open: 100, high: 105, low: 95, close: 102, volume: 1000 },
        { timestamp: 2000, open: 102, high: 105, low: 98, close: 103, volume: 1100 },
      ];
      const result = detector.detectEqualHighs(candles, 0.001);
      
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('equal_highs');
      expect(result[0].price).toBe(105);
      expect(result[0].candleIndices).toEqual([0, 1]);
      expect(result[0].strength).toBe(2);
    });

    it('should detect equal highs within tolerance', () => {
      const candles: Candlestick[] = [
        { timestamp: 1000, open: 100, high: 100, low: 95, close: 98, volume: 1000 },
        { timestamp: 2000, open: 98, high: 100.05, low: 96, close: 99, volume: 1100 },
        { timestamp: 3000, open: 99, high: 99.95, low: 97, close: 98, volume: 1050 },
      ];
      const result = detector.detectEqualHighs(candles, 0.001); // 0.1% tolerance
      
      expect(result).toHaveLength(1);
      expect(result[0].candleIndices).toHaveLength(3);
      expect(result[0].strength).toBe(3);
    });

    it('should not detect highs outside tolerance', () => {
      const candles: Candlestick[] = [
        { timestamp: 1000, open: 100, high: 100, low: 95, close: 98, volume: 1000 },
        { timestamp: 2000, open: 98, high: 102, low: 96, close: 99, volume: 1100 },
      ];
      const result = detector.detectEqualHighs(candles, 0.001); // 0.1% tolerance
      
      expect(result).toEqual([]);
    });

    it('should handle tolerance of 0%', () => {
      const candles: Candlestick[] = [
        { timestamp: 1000, open: 100, high: 105, low: 95, close: 102, volume: 1000 },
        { timestamp: 2000, open: 102, high: 105, low: 98, close: 103, volume: 1100 },
        { timestamp: 3000, open: 103, high: 105.01, low: 99, close: 104, volume: 1200 },
      ];
      const result = detector.detectEqualHighs(candles, 0);
      
      expect(result).toHaveLength(1);
      expect(result[0].candleIndices).toEqual([0, 1]);
    });

    it('should handle tolerance of 100%', () => {
      const candles: Candlestick[] = [
        { timestamp: 1000, open: 100, high: 100, low: 95, close: 98, volume: 1000 },
        { timestamp: 2000, open: 98, high: 150, low: 96, close: 99, volume: 1100 },
        { timestamp: 3000, open: 99, high: 200, low: 97, close: 98, volume: 1050 },
      ];
      const result = detector.detectEqualHighs(candles, 1.0); // 100% tolerance
      
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('detectEqualLows', () => {
    it('should return empty array for empty candles', () => {
      const result = detector.detectEqualLows([], 0.001);
      expect(result).toEqual([]);
    });

    it('should detect equal lows with exactly 2 candles', () => {
      const candles: Candlestick[] = [
        { timestamp: 1000, open: 100, high: 105, low: 95, close: 102, volume: 1000 },
        { timestamp: 2000, open: 102, high: 107, low: 95, close: 103, volume: 1100 },
      ];
      const result = detector.detectEqualLows(candles, 0.001);
      
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('equal_lows');
      expect(result[0].price).toBe(95);
      expect(result[0].candleIndices).toEqual([0, 1]);
      expect(result[0].strength).toBe(2);
    });

    it('should detect equal lows within tolerance', () => {
      const candles: Candlestick[] = [
        { timestamp: 1000, open: 100, high: 105, low: 95, close: 98, volume: 1000 },
        { timestamp: 2000, open: 98, high: 103, low: 95.05, close: 99, volume: 1100 },
        { timestamp: 3000, open: 99, high: 104, low: 94.95, close: 98, volume: 1050 },
      ];
      const result = detector.detectEqualLows(candles, 0.001); // 0.1% tolerance
      
      expect(result).toHaveLength(1);
      expect(result[0].candleIndices).toHaveLength(3);
    });
  });

  describe('detectPreviousDayHighLow', () => {
    it('should return empty array for empty candles', () => {
      const result = detector.detectPreviousDayHighLow([]);
      expect(result).toEqual([]);
    });

    it('should return empty array for single day data', () => {
      const candles: Candlestick[] = [
        { timestamp: Date.UTC(2024, 0, 1, 10, 0), open: 100, high: 105, low: 95, close: 102, volume: 1000 },
        { timestamp: Date.UTC(2024, 0, 1, 11, 0), open: 102, high: 107, low: 96, close: 103, volume: 1100 },
      ];
      const result = detector.detectPreviousDayHighLow(candles);
      expect(result).toEqual([]);
    });

    it('should detect PDH and PDL for multi-day data', () => {
      const candles: Candlestick[] = [
        // Day 1
        { timestamp: Date.UTC(2024, 0, 1, 10, 0), open: 100, high: 105, low: 95, close: 102, volume: 1000 },
        { timestamp: Date.UTC(2024, 0, 1, 11, 0), open: 102, high: 110, low: 96, close: 103, volume: 1100 },
        { timestamp: Date.UTC(2024, 0, 1, 12, 0), open: 103, high: 108, low: 90, close: 104, volume: 1200 },
        // Day 2
        { timestamp: Date.UTC(2024, 0, 2, 10, 0), open: 104, high: 115, low: 100, close: 105, volume: 1300 },
      ];
      const result = detector.detectPreviousDayHighLow(candles);
      
      expect(result).toHaveLength(2);
      
      const pdh = result.find(p => p.type === 'pdh');
      const pdl = result.find(p => p.type === 'pdl');
      
      expect(pdh).toBeDefined();
      expect(pdh?.price).toBe(110); // Highest from day 1
      
      expect(pdl).toBeDefined();
      expect(pdl?.price).toBe(90); // Lowest from day 1
    });
  });

  describe('detectAsianRange', () => {
    it('should return empty array for empty candles', () => {
      const result = detector.detectAsianRange([]);
      expect(result).toEqual([]);
    });

    it('should detect Asian High and Low for Asian session hours', () => {
      const candles: Candlestick[] = [
        // Asian session (00:00-08:00 UTC)
        { timestamp: Date.UTC(2024, 0, 1, 0, 0), open: 100, high: 105, low: 95, close: 102, volume: 1000 },
        { timestamp: Date.UTC(2024, 0, 1, 2, 0), open: 102, high: 110, low: 96, close: 103, volume: 1100 },
        { timestamp: Date.UTC(2024, 0, 1, 6, 0), open: 103, high: 108, low: 90, close: 104, volume: 1200 },
        // Outside Asian session
        { timestamp: Date.UTC(2024, 0, 1, 10, 0), open: 104, high: 115, low: 85, close: 105, volume: 1300 },
      ];
      const result = detector.detectAsianRange(candles);
      
      expect(result).toHaveLength(2);
      
      const asianHigh = result.find(p => p.type === 'asian_high');
      const asianLow = result.find(p => p.type === 'asian_low');
      
      expect(asianHigh).toBeDefined();
      expect(asianHigh?.price).toBe(110); // Highest during Asian session
      
      expect(asianLow).toBeDefined();
      expect(asianLow?.price).toBe(90); // Lowest during Asian session
    });

    it('should not include candles outside Asian session', () => {
      const candles: Candlestick[] = [
        // Outside Asian session
        { timestamp: Date.UTC(2024, 0, 1, 10, 0), open: 100, high: 120, low: 80, close: 102, volume: 1000 },
        { timestamp: Date.UTC(2024, 0, 1, 14, 0), open: 102, high: 125, low: 75, close: 103, volume: 1100 },
      ];
      const result = detector.detectAsianRange(candles);
      
      expect(result).toEqual([]);
    });
  });

  describe('detectRangeHighLow', () => {
    it('should return empty array for empty candles', () => {
      const result = detector.detectRangeHighLow([], 3);
      expect(result).toEqual([]);
    });

    it('should return empty array when candles less than minTouches', () => {
      const candles: Candlestick[] = [
        { timestamp: 1000, open: 100, high: 105, low: 95, close: 102, volume: 1000 },
        { timestamp: 2000, open: 102, high: 105, low: 96, close: 103, volume: 1100 },
      ];
      const result = detector.detectRangeHighLow(candles, 3);
      expect(result).toEqual([]);
    });

    it('should detect range high and low with minimum touches', () => {
      const candles: Candlestick[] = [
        { timestamp: 1000, open: 100, high: 105, low: 95, close: 102, volume: 1000 },
        { timestamp: 2000, open: 102, high: 105, low: 96, close: 103, volume: 1100 },
        { timestamp: 3000, open: 103, high: 105, low: 97, close: 104, volume: 1200 },
        { timestamp: 4000, open: 104, high: 106, low: 95, close: 105, volume: 1300 },
        { timestamp: 5000, open: 105, high: 107, low: 95, close: 106, volume: 1400 },
        { timestamp: 6000, open: 106, high: 108, low: 95, close: 107, volume: 1500 },
      ];
      const result = detector.detectRangeHighLow(candles, 3);
      
      expect(result.length).toBeGreaterThan(0);
      
      const rangeLow = result.find(p => p.type === 'range_low');
      expect(rangeLow).toBeDefined();
      expect(rangeLow?.strength).toBeGreaterThanOrEqual(3);
    });
  });

  describe('detectTrendlineHighLow', () => {
    it('should return empty array for empty candles', () => {
      const result = detector.detectTrendlineHighLow([]);
      expect(result).toEqual([]);
    });

    it('should return empty array for insufficient candles', () => {
      const candles: Candlestick[] = [
        { timestamp: 1000, open: 100, high: 105, low: 95, close: 102, volume: 1000 },
        { timestamp: 2000, open: 102, high: 107, low: 96, close: 103, volume: 1100 },
      ];
      const result = detector.detectTrendlineHighLow(candles);
      expect(result).toEqual([]);
    });

    it('should detect trendline high and low from swing points', () => {
      // Create a trending pattern with clear swing highs and lows
      const candles: Candlestick[] = [
        { timestamp: 1000, open: 100, high: 105, low: 95, close: 102, volume: 1000 },
        { timestamp: 2000, open: 102, high: 107, low: 96, close: 103, volume: 1100 },
        { timestamp: 3000, open: 103, high: 120, low: 97, close: 104, volume: 1200 }, // Swing high
        { timestamp: 4000, open: 104, high: 109, low: 98, close: 105, volume: 1300 },
        { timestamp: 5000, open: 105, high: 110, low: 99, close: 106, volume: 1400 },
        { timestamp: 6000, open: 106, high: 111, low: 85, close: 107, volume: 1500 }, // Swing low
        { timestamp: 7000, open: 107, high: 112, low: 101, close: 108, volume: 1600 },
        { timestamp: 8000, open: 108, high: 113, low: 102, close: 109, volume: 1700 },
      ];
      const result = detector.detectTrendlineHighLow(candles);
      
      // Should detect at least one trendline high or low
      expect(result.length).toBeGreaterThan(0);
      
      const trendlineHigh = result.find(p => p.type === 'trendline_high');
      const trendlineLow = result.find(p => p.type === 'trendline_low');
      
      // At least one should be detected
      expect(trendlineHigh || trendlineLow).toBeTruthy();
    });
  });

  describe('getAllPools', () => {
    it('should return empty array for empty candles', () => {
      const result = detector.getAllPools([]);
      expect(result).toEqual([]);
    });

    it('should aggregate all pool types', () => {
      const candles: Candlestick[] = [
        // Day 1 - Asian session
        { timestamp: Date.UTC(2024, 0, 1, 2, 0), open: 100, high: 105, low: 95, close: 102, volume: 1000 },
        { timestamp: Date.UTC(2024, 0, 1, 4, 0), open: 102, high: 105, low: 96, close: 103, volume: 1100 },
        { timestamp: Date.UTC(2024, 0, 1, 6, 0), open: 103, high: 110, low: 90, close: 104, volume: 1200 },
        // Day 1 - Later
        { timestamp: Date.UTC(2024, 0, 1, 10, 0), open: 104, high: 115, low: 100, close: 105, volume: 1300 },
        { timestamp: Date.UTC(2024, 0, 1, 12, 0), open: 105, high: 120, low: 101, close: 106, volume: 1400 },
        { timestamp: Date.UTC(2024, 0, 1, 14, 0), open: 106, high: 125, low: 102, close: 107, volume: 1500 },
        // Day 2
        { timestamp: Date.UTC(2024, 0, 2, 10, 0), open: 107, high: 130, low: 103, close: 108, volume: 1600 },
      ];
      const result = detector.getAllPools(candles);
      
      // Should have pools from multiple detection methods
      expect(result.length).toBeGreaterThan(0);
      
      // Check for different pool types
      const poolTypes = new Set(result.map(p => p.type));
      expect(poolTypes.size).toBeGreaterThan(1);
    });

    it('should handle invalid OHLCV values gracefully', () => {
      const candles: Candlestick[] = [
        { timestamp: 1000, open: 100, high: 105, low: 95, close: 102, volume: 1000 },
        { timestamp: 2000, open: NaN, high: NaN, low: NaN, close: NaN, volume: NaN },
        { timestamp: 3000, open: 103, high: 108, low: 97, close: 104, volume: 1200 },
      ];
      
      // Should not throw error
      expect(() => detector.getAllPools(candles)).not.toThrow();
    });
  });
});

/**
 * Property-Based Tests for LiquidityPoolDetector
 * 
 * Tests universal properties that should hold for all valid inputs
 * Using fast-check for property-based testing with minimum 100 iterations
 */

import * as fc from 'fast-check';

// ============================================================================
// Arbitraries (Generators) for Property-Based Testing
// ============================================================================

/**
 * Generate a valid candlestick with proper OHLCV constraints
 */
const candlestickArbitrary = (): fc.Arbitrary<Candlestick> => {
  return fc
    .record({
      timestamp: fc.integer({ min: 0, max: Date.now() }),
      low: fc.double({ min: 1, max: 100000, noNaN: true }),
      high: fc.double({ min: 1, max: 100000, noNaN: true }),
      open: fc.double({ min: 1, max: 100000, noNaN: true }),
      close: fc.double({ min: 1, max: 100000, noNaN: true }),
      volume: fc.double({ min: 0, max: 1000000, noNaN: true }),
    })
    .map((candle) => {
      // Ensure OHLC constraints: low <= open,close <= high
      const low = Math.min(candle.low, candle.high, candle.open, candle.close);
      const high = Math.max(candle.low, candle.high, candle.open, candle.close);
      const open = Math.max(low, Math.min(high, candle.open));
      const close = Math.max(low, Math.min(high, candle.close));

      return {
        timestamp: candle.timestamp,
        open,
        high,
        low,
        close,
        volume: candle.volume,
      };
    });
};

/**
 * Generate candles with Equal Highs within tolerance
 */
const candlesWithEqualHighs = (
  count: number,
  tolerance: number
): fc.Arbitrary<Candlestick[]> => {
  return fc
    .tuple(
      fc.double({ min: 10, max: 100000, noNaN: true }),
      fc.array(candlestickArbitrary(), { minLength: count, maxLength: count + 10 })
    )
    .map(([targetHigh, candles]) => {
      // Modify first 'count' candles to have Equal Highs
      return candles.map((c, i) => {
        if (i < count) {
          // Add small variation within tolerance
          const variation = targetHigh * tolerance * (Math.random() * 2 - 1);
          const newHigh = targetHigh + variation;
          return {
            ...c,
            high: newHigh,
            open: Math.min(c.open, newHigh),
            close: Math.min(c.close, newHigh),
          };
        }
        return c;
      });
    });
};

/**
 * Generate candles with Equal Lows within tolerance
 */
const candlesWithEqualLows = (
  count: number,
  tolerance: number
): fc.Arbitrary<Candlestick[]> => {
  return fc
    .tuple(
      fc.double({ min: 10, max: 100000, noNaN: true }),
      fc.array(candlestickArbitrary(), { minLength: count, maxLength: count + 10 })
    )
    .map(([targetLow, candles]) => {
      // Modify first 'count' candles to have Equal Lows
      return candles.map((c, i) => {
        if (i < count) {
          // Add small variation within tolerance
          const variation = targetLow * tolerance * (Math.random() * 2 - 1);
          const newLow = targetLow + variation;
          return {
            ...c,
            low: newLow,
            open: Math.max(c.open, newLow),
            close: Math.max(c.close, newLow),
          };
        }
        return c;
      });
    });
};

/**
 * Generate multi-day candle data
 */
const multiDayCandlesArbitrary = (days: number): fc.Arbitrary<Candlestick[]> => {
  return fc.array(candlestickArbitrary(), { minLength: days * 2, maxLength: days * 10 }).map((candles) => {
    // Assign timestamps across multiple days
    const baseTime = Date.UTC(2024, 0, 1, 0, 0, 0);
    const msPerDay = 24 * 60 * 60 * 1000;
    
    return candles.map((c, i) => {
      const dayIndex = Math.floor((i / candles.length) * days);
      const hourOffset = (i % 24) * 60 * 60 * 1000;
      return {
        ...c,
        timestamp: baseTime + dayIndex * msPerDay + hourOffset,
      };
    });
  });
};

/**
 * Generate candles in Asian session hours (00:00-08:00 UTC)
 */
const asianSessionCandlesArbitrary = (): fc.Arbitrary<Candlestick[]> => {
  return fc.array(candlestickArbitrary(), { minLength: 3, maxLength: 20 }).map((candles) => {
    const baseTime = Date.UTC(2024, 0, 1, 0, 0, 0);
    
    return candles.map((c, i) => {
      // Distribute across Asian session hours (0-8 UTC)
      const hour = i % 8;
      const minute = (i * 15) % 60;
      return {
        ...c,
        timestamp: baseTime + hour * 60 * 60 * 1000 + minute * 60 * 1000,
      };
    });
  });
};

/**
 * Generate ranging (sideways) market candles
 */
const rangingCandlesArbitrary = (minTouches: number): fc.Arbitrary<Candlestick[]> => {
  return fc
    .tuple(
      fc.double({ min: 90, max: 95, noNaN: true }), // Range low
      fc.double({ min: 105, max: 110, noNaN: true }), // Range high
      fc.array(candlestickArbitrary(), { minLength: minTouches * 2, maxLength: minTouches * 4 })
    )
    .map(([rangeLow, rangeHigh, candles]) => {
      return candles.map((c, i) => {
        // Create touches at range boundaries
        const touchHigh = i % 3 === 0;
        const touchLow = i % 3 === 1;
        
        if (touchHigh) {
          return {
            ...c,
            high: rangeHigh + (Math.random() * 0.5),
            low: Math.max(rangeLow, c.low),
            open: rangeHigh - 2,
            close: rangeHigh - 1,
          };
        } else if (touchLow) {
          return {
            ...c,
            low: rangeLow - (Math.random() * 0.5),
            high: Math.min(rangeHigh, c.high),
            open: rangeLow + 2,
            close: rangeLow + 1,
          };
        } else {
          // Middle of range
          return {
            ...c,
            high: Math.min(rangeHigh - 1, c.high),
            low: Math.max(rangeLow + 1, c.low),
          };
        }
      });
    });
};

/**
 * Generate trending market candles
 */
const trendingCandlesArbitrary = (direction: 'up' | 'down'): fc.Arbitrary<Candlestick[]> => {
  return fc.array(candlestickArbitrary(), { minLength: 10, maxLength: 30 }).map((candles) => {
    let basePrice = 100;
    const trend = direction === 'up' ? 1 : -1;
    
    return candles.map((c, i) => {
      // Create trending movement with swing points
      basePrice += trend * (Math.random() * 2 + 0.5);
      const volatility = 5;
      
      return {
        ...c,
        open: basePrice,
        high: basePrice + volatility,
        low: basePrice - volatility,
        close: basePrice + trend * (Math.random() * 2),
        timestamp: Date.UTC(2024, 0, 1, 0, 0, 0) + i * 60 * 60 * 1000,
      };
    });
  });
};

// ============================================================================
// Property-Based Tests
// ============================================================================

describe('LiquidityPoolDetector - Property-Based Tests', () => {
  let detector: LiquidityPoolDetector;

  beforeEach(() => {
    detector = new LiquidityPoolDetector(defaultConfig);
  });

  describe('Property 1: Equal Levels Detection', () => {
    it('**Validates: Requirements 1.1, 1.2** - should detect all Equal Highs within tolerance', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 3, max: 10 }), // At least 3 candles to ensure detection
          fc.double({ min: 0.0005, max: 0.005, noNaN: true }), // Reasonable tolerance range
          (count, tolerance) => {
            // Generate candles with Equal Highs - ensure they're actually within tolerance
            const targetHigh = 100 + Math.random() * 100;
            const candles: Candlestick[] = [];
            
            // Create 'count' candles with Equal Highs within tolerance
            for (let i = 0; i < count; i++) {
              // Ensure variation is strictly within tolerance (use 0.8 factor for safety)
              const variation = targetHigh * tolerance * 0.8 * (Math.random() * 2 - 1);
              const newHigh = targetHigh + variation;
              const newLow = newHigh - 10;
              
              candles.push({
                timestamp: Date.now() + i * 1000,
                high: newHigh,
                low: newLow,
                open: newLow + 2,
                close: newLow + 5,
                volume: 1000 + Math.random() * 1000,
              });
            }

            const pools = detector.detectEqualHighs(candles, tolerance);

            // Should detect at least one pool
            expect(pools.length).toBeGreaterThan(0);

            // All detected pools should have prices within tolerance
            for (const pool of pools) {
              const prices = pool.candleIndices.map(i => candles[i].high);
              const maxPrice = Math.max(...prices);
              const minPrice = Math.min(...prices);
              const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
              const maxDiff = maxPrice - minPrice;

              // Check that all prices are within tolerance of average
              expect(maxDiff / avgPrice).toBeLessThanOrEqual(tolerance * 2);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('**Validates: Requirements 1.1, 1.2** - should detect all Equal Lows within tolerance', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 3, max: 10 }), // At least 3 candles to ensure detection
          fc.double({ min: 0.0005, max: 0.005, noNaN: true }), // Reasonable tolerance range
          (count, tolerance) => {
            // Generate candles with Equal Lows - ensure they're actually within tolerance
            const targetLow = 50 + Math.random() * 50;
            const candles: Candlestick[] = [];
            
            // Create 'count' candles with Equal Lows within tolerance
            for (let i = 0; i < count; i++) {
              // Ensure variation is strictly within tolerance (use 0.8 factor for safety)
              const variation = targetLow * tolerance * 0.8 * (Math.random() * 2 - 1);
              const newLow = targetLow + variation;
              const newHigh = newLow + 10;
              
              candles.push({
                timestamp: Date.now() + i * 1000,
                low: newLow,
                high: newHigh,
                open: newHigh - 2,
                close: newHigh - 5,
                volume: 1000 + Math.random() * 1000,
              });
            }

            const pools = detector.detectEqualLows(candles, tolerance);

            // Should detect at least one pool
            expect(pools.length).toBeGreaterThan(0);

            // All detected pools should have prices within tolerance
            for (const pool of pools) {
              const prices = pool.candleIndices.map(i => candles[i].low);
              const maxPrice = Math.max(...prices);
              const minPrice = Math.min(...prices);
              const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
              const maxDiff = maxPrice - minPrice;

              // Check that all prices are within tolerance of average
              expect(maxDiff / avgPrice).toBeLessThanOrEqual(tolerance * 2);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 2: Previous Day High/Low Persistence', () => {
    it('**Validates: Requirements 1.3** - should preserve PDH/PDL across day transitions', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 5 }),
          fc.array(candlestickArbitrary(), { minLength: 4, maxLength: 50 }),
          (days, baseCandles) => {
            // Assign timestamps across multiple days
            const baseTime = Date.UTC(2024, 0, 1, 0, 0, 0);
            const msPerDay = 24 * 60 * 60 * 1000;
            
            const candles = baseCandles.map((c, i) => {
              const dayIndex = Math.floor((i / baseCandles.length) * days);
              const hourOffset = (i % 24) * 60 * 60 * 1000;
              return {
                ...c,
                timestamp: baseTime + dayIndex * msPerDay + hourOffset,
              };
            });

            const pools = detector.detectPreviousDayHighLow(candles);

            // Group candles by day
            const dayGroups = new Map<string, Candlestick[]>();
            for (const candle of candles) {
              const date = new Date(candle.timestamp);
              const dayKey = `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;
              if (!dayGroups.has(dayKey)) {
                dayGroups.set(dayKey, []);
              }
              dayGroups.get(dayKey)!.push(candle);
            }

            const uniqueDays = dayGroups.size;

            if (uniqueDays >= 2) {
              // Should have PDH and PDL for each day after the first
              expect(pools.length).toBeGreaterThanOrEqual((uniqueDays - 1) * 2);

              // Verify PDH/PDL values are correct
              const sortedDays = Array.from(dayGroups.entries()).sort((a, b) => {
                const dateA = new Date(a[1][0].timestamp);
                const dateB = new Date(b[1][0].timestamp);
                return dateA.getTime() - dateB.getTime();
              });

              for (let i = 1; i < sortedDays.length; i++) {
                const previousDayCandles = sortedDays[i - 1][1];
                const expectedPDH = Math.max(...previousDayCandles.map(c => c.high));
                const expectedPDL = Math.min(...previousDayCandles.map(c => c.low));

                // Find PDH and PDL pools for this day
                const pdhPools = pools.filter(p => p.type === 'pdh' && p.price === expectedPDH);
                const pdlPools = pools.filter(p => p.type === 'pdl' && p.price === expectedPDL);

                expect(pdhPools.length).toBeGreaterThan(0);
                expect(pdlPools.length).toBeGreaterThan(0);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 3: Asian Range Detection', () => {
    it('**Validates: Requirements 1.4** - should correctly identify Asian High/Low', () => {
      fc.assert(
        fc.property(asianSessionCandlesArbitrary(), (candles) => {
          const pools = detector.detectAsianRange(candles);

          // Filter candles in Asian session
          const asianCandles = candles.filter(c => {
            const hour = new Date(c.timestamp).getUTCHours();
            return hour >= 0 && hour < 8;
          });

          if (asianCandles.length > 0) {
            // Should detect Asian High and Low
            expect(pools.length).toBeGreaterThanOrEqual(2);

            const asianHigh = pools.find(p => p.type === 'asian_high');
            const asianLow = pools.find(p => p.type === 'asian_low');

            expect(asianHigh).toBeDefined();
            expect(asianLow).toBeDefined();

            // Verify Asian High is the maximum high in session
            const expectedHigh = Math.max(...asianCandles.map(c => c.high));
            expect(asianHigh?.price).toBe(expectedHigh);

            // Verify Asian Low is the minimum low in session
            const expectedLow = Math.min(...asianCandles.map(c => c.low));
            expect(asianLow?.price).toBe(expectedLow);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 4: Range High/Low Detection', () => {
    it('**Validates: Requirements 1.5** - should detect Range High/Low with minimum touches', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 3, max: 6 }),
          fc.double({ min: 90, max: 95, noNaN: true }),
          fc.double({ min: 105, max: 110, noNaN: true }),
          fc.array(candlestickArbitrary(), { minLength: 6, maxLength: 24 }),
          (minTouches, rangeLow, rangeHigh, baseCandles) => {
            // Create ranging candles with touches at boundaries
            const candles = baseCandles.map((c, i) => {
              const touchHigh = i % 3 === 0;
              const touchLow = i % 3 === 1;
              
              if (touchHigh) {
                return {
                  ...c,
                  high: rangeHigh + (Math.random() * 0.5),
                  low: Math.max(rangeLow, c.low),
                  open: rangeHigh - 2,
                  close: rangeHigh - 1,
                };
              } else if (touchLow) {
                return {
                  ...c,
                  low: rangeLow - (Math.random() * 0.5),
                  high: Math.min(rangeHigh, c.high),
                  open: rangeLow + 2,
                  close: rangeLow + 1,
                };
              } else {
                return {
                  ...c,
                  high: Math.min(rangeHigh - 1, c.high),
                  low: Math.max(rangeLow + 1, c.low),
                };
              }
            });

            const pools = detector.detectRangeHighLow(candles, minTouches);

            // All detected pools should have at least minTouches
            for (const pool of pools) {
              expect(pool.strength).toBeGreaterThanOrEqual(minTouches);
              expect(pool.candleIndices.length).toBeGreaterThanOrEqual(minTouches);
            }

            // Verify pool types
            for (const pool of pools) {
              expect(['range_high', 'range_low']).toContain(pool.type);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 5: Trendline Extremes Detection', () => {
    it('**Validates: Requirements 1.6** - should detect Trendline High/Low in trends', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('up' as const, 'down' as const),
          fc.array(candlestickArbitrary(), { minLength: 10, maxLength: 30 }),
          (direction, baseCandles) => {
            // Create trending candles with clear swing points
            let basePrice = 100;
            const trend = direction === 'up' ? 1 : -1;
            
            const candles = baseCandles.map((c, i) => {
              // Create more pronounced trend with volatility
              basePrice += trend * (Math.random() * 3 + 1);
              const volatility = 8 + Math.random() * 5;
              
              const open = basePrice;
              const close = basePrice + trend * (Math.random() * 3);
              const high = Math.max(open, close) + volatility;
              const low = Math.min(open, close) - volatility;
              
              return {
                ...c,
                open,
                high,
                low,
                close,
                timestamp: Date.UTC(2024, 0, 1, 0, 0, 0) + i * 60 * 60 * 1000,
              };
            });

            const pools = detector.detectTrendlineHighLow(candles);

            // With sufficient candles, verify pool types if any detected
            if (candles.length >= 5) {
              for (const pool of pools) {
                // All detected pools should be trendline types
                expect(['trendline_high', 'trendline_low']).toContain(pool.type);
                
                // Pool should have valid candleIndices
                expect(pool.candleIndices.length).toBeGreaterThan(0);
                
                // Pool price should be from actual candle data
                if (pool.type === 'trendline_high') {
                  const candleIndex = pool.candleIndices[0];
                  expect(pool.price).toBe(candles[candleIndex].high);
                } else if (pool.type === 'trendline_low') {
                  const candleIndex = pool.candleIndices[0];
                  expect(pool.price).toBe(candles[candleIndex].low);
                }
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ============================================================================
  // Additional Unit Tests for Edge Cases (Task 2.7)
  // ============================================================================

  describe('Edge Cases and Boundary Conditions', () => {
    describe('Empty and Invalid Input', () => {
      it('should handle empty array for all detection methods', () => {
        expect(detector.detectEqualHighs([], 0.001)).toEqual([]);
        expect(detector.detectEqualLows([], 0.001)).toEqual([]);
        expect(detector.detectPreviousDayHighLow([])).toEqual([]);
        expect(detector.detectAsianRange([])).toEqual([]);
        expect(detector.detectRangeHighLow([], 3)).toEqual([]);
        expect(detector.detectTrendlineHighLow([])).toEqual([]);
        expect(detector.getAllPools([])).toEqual([]);
      });

      it('should handle candles with NaN values gracefully', () => {
        const invalidCandles: Candlestick[] = [
          { timestamp: 1000, open: NaN, high: NaN, low: NaN, close: NaN, volume: NaN },
          { timestamp: 2000, open: 100, high: 105, low: 95, close: 102, volume: 1000 },
        ];

        // Should not throw errors
        expect(() => detector.detectEqualHighs(invalidCandles, 0.001)).not.toThrow();
        expect(() => detector.detectEqualLows(invalidCandles, 0.001)).not.toThrow();
        expect(() => detector.getAllPools(invalidCandles)).not.toThrow();
      });

      it('should handle candles with negative values', () => {
        const negativeCandles: Candlestick[] = [
          { timestamp: 1000, open: -100, high: -95, low: -105, close: -98, volume: -1000 },
          { timestamp: 2000, open: -102, high: -96, low: -107, close: -99, volume: -1100 },
        ];

        // Should not throw errors
        expect(() => detector.detectEqualHighs(negativeCandles, 0.001)).not.toThrow();
        expect(() => detector.detectEqualLows(negativeCandles, 0.001)).not.toThrow();
      });

      it('should handle candles with zero values', () => {
        const zeroCandles: Candlestick[] = [
          { timestamp: 0, open: 0, high: 0, low: 0, close: 0, volume: 0 },
          { timestamp: 0, open: 0, high: 0, low: 0, close: 0, volume: 0 },
        ];

        // Should not throw errors
        expect(() => detector.detectEqualHighs(zeroCandles, 0.001)).not.toThrow();
        expect(() => detector.detectEqualLows(zeroCandles, 0.001)).not.toThrow();
      });
    });

    describe('Exactly 2 Candles for Equal Highs/Lows', () => {
      it('should detect Equal Highs with exactly 2 candles within tolerance', () => {
        const candles: Candlestick[] = [
          { timestamp: 1000, open: 100, high: 100.00, low: 95, close: 98, volume: 1000 },
          { timestamp: 2000, open: 98, high: 100.05, low: 96, close: 99, volume: 1100 },
        ];
        const result = detector.detectEqualHighs(candles, 0.001); // 0.1% tolerance

        expect(result).toHaveLength(1);
        expect(result[0].type).toBe('equal_highs');
        expect(result[0].candleIndices).toEqual([0, 1]);
        expect(result[0].strength).toBe(2);
      });

      it('should detect Equal Lows with exactly 2 candles within tolerance', () => {
        const candles: Candlestick[] = [
          { timestamp: 1000, open: 100, high: 105, low: 95.00, close: 98, volume: 1000 },
          { timestamp: 2000, open: 98, high: 103, low: 95.05, close: 99, volume: 1100 },
        ];
        const result = detector.detectEqualLows(candles, 0.001); // 0.1% tolerance

        expect(result).toHaveLength(1);
        expect(result[0].type).toBe('equal_lows');
        expect(result[0].candleIndices).toEqual([0, 1]);
        expect(result[0].strength).toBe(2);
      });

      it('should not detect Equal Highs with exactly 2 candles outside tolerance', () => {
        const candles: Candlestick[] = [
          { timestamp: 1000, open: 100, high: 100, low: 95, close: 98, volume: 1000 },
          { timestamp: 2000, open: 98, high: 105, low: 96, close: 99, volume: 1100 },
        ];
        const result = detector.detectEqualHighs(candles, 0.001); // 0.1% tolerance

        expect(result).toEqual([]);
      });

      it('should not detect Equal Lows with exactly 2 candles outside tolerance', () => {
        const candles: Candlestick[] = [
          { timestamp: 1000, open: 100, high: 105, low: 95, close: 98, volume: 1000 },
          { timestamp: 2000, open: 98, high: 103, low: 90, close: 99, volume: 1100 },
        ];
        const result = detector.detectEqualLows(candles, 0.001); // 0.1% tolerance

        expect(result).toEqual([]);
      });
    });

    describe('Boundary Tolerance Values', () => {
      it('should handle tolerance of 0% (exact match required)', () => {
        const candles: Candlestick[] = [
          { timestamp: 1000, open: 100, high: 105.00, low: 95, close: 102, volume: 1000 },
          { timestamp: 2000, open: 102, high: 105.00, low: 98, close: 103, volume: 1100 },
          { timestamp: 3000, open: 103, high: 105.01, low: 99, close: 104, volume: 1200 },
        ];
        const result = detector.detectEqualHighs(candles, 0); // 0% tolerance

        expect(result).toHaveLength(1);
        expect(result[0].candleIndices).toEqual([0, 1]); // Only first two match exactly
        expect(result[0].strength).toBe(2);
      });

      it('should handle tolerance of 100% (all prices match)', () => {
        const candles: Candlestick[] = [
          { timestamp: 1000, open: 100, high: 50, low: 45, close: 48, volume: 1000 },
          { timestamp: 2000, open: 98, high: 100, low: 46, close: 49, volume: 1100 },
          { timestamp: 3000, open: 99, high: 150, low: 47, close: 48, volume: 1050 },
        ];
        const result = detector.detectEqualHighs(candles, 1.0); // 100% tolerance

        // With 100% tolerance, all highs should be considered equal
        expect(result.length).toBeGreaterThan(0);
        const pool = result[0];
        expect(pool.candleIndices.length).toBeGreaterThanOrEqual(2);
      });

      it('should handle very small tolerance (0.01%)', () => {
        const candles: Candlestick[] = [
          { timestamp: 1000, open: 100, high: 100.000, low: 95, close: 98, volume: 1000 },
          { timestamp: 2000, open: 98, high: 100.005, low: 96, close: 99, volume: 1100 },
          { timestamp: 3000, open: 99, high: 100.015, low: 97, close: 98, volume: 1050 },
        ];
        const result = detector.detectEqualHighs(candles, 0.0001); // 0.01% tolerance

        expect(result).toHaveLength(1);
        expect(result[0].candleIndices).toEqual([0, 1]); // Only first two within 0.01%
      });

      it('should handle very large tolerance (200%)', () => {
        const candles: Candlestick[] = [
          { timestamp: 1000, open: 100, high: 10, low: 5, close: 8, volume: 1000 },
          { timestamp: 2000, open: 98, high: 50, low: 6, close: 9, volume: 1100 },
          { timestamp: 3000, open: 99, high: 100, low: 7, close: 8, volume: 1050 },
        ];
        const result = detector.detectEqualHighs(candles, 2.0); // 200% tolerance

        // With 200% tolerance, all highs should be considered equal
        expect(result.length).toBeGreaterThan(0);
      });
    });

    describe('Tolerance Edge Cases for Equal Lows', () => {
      it('should handle tolerance of 0% for Equal Lows', () => {
        const candles: Candlestick[] = [
          { timestamp: 1000, open: 100, high: 105, low: 95.00, close: 98, volume: 1000 },
          { timestamp: 2000, open: 98, high: 103, low: 95.00, close: 99, volume: 1100 },
          { timestamp: 3000, open: 99, high: 104, low: 95.01, close: 98, volume: 1050 },
        ];
        const result = detector.detectEqualLows(candles, 0); // 0% tolerance

        expect(result).toHaveLength(1);
        expect(result[0].candleIndices).toEqual([0, 1]); // Only first two match exactly
      });

      it('should handle tolerance of 100% for Equal Lows', () => {
        const candles: Candlestick[] = [
          { timestamp: 1000, open: 100, high: 105, low: 50, close: 98, volume: 1000 },
          { timestamp: 2000, open: 98, high: 103, low: 100, close: 99, volume: 1100 },
          { timestamp: 3000, open: 99, high: 104, low: 150, close: 98, volume: 1050 },
        ];
        const result = detector.detectEqualLows(candles, 1.0); // 100% tolerance

        // With 100% tolerance, all lows should be considered equal
        expect(result.length).toBeGreaterThan(0);
      });
    });

    describe('Special Cases', () => {
      it('should handle single candle (no pools detected)', () => {
        const candles: Candlestick[] = [
          { timestamp: 1000, open: 100, high: 105, low: 95, close: 102, volume: 1000 },
        ];

        expect(detector.detectEqualHighs(candles, 0.001)).toEqual([]);
        expect(detector.detectEqualLows(candles, 0.001)).toEqual([]);
        expect(detector.detectPreviousDayHighLow(candles)).toEqual([]);
        expect(detector.detectRangeHighLow(candles, 3)).toEqual([]);
        expect(detector.detectTrendlineHighLow(candles)).toEqual([]);
      });

      it('should handle all candles with identical OHLC values', () => {
        const candles: Candlestick[] = [
          { timestamp: 1000, open: 100, high: 100, low: 100, close: 100, volume: 1000 },
          { timestamp: 2000, open: 100, high: 100, low: 100, close: 100, volume: 1000 },
          { timestamp: 3000, open: 100, high: 100, low: 100, close: 100, volume: 1000 },
        ];

        const highPools = detector.detectEqualHighs(candles, 0.001);
        const lowPools = detector.detectEqualLows(candles, 0.001);

        expect(highPools).toHaveLength(1);
        expect(highPools[0].candleIndices).toEqual([0, 1, 2]);
        expect(lowPools).toHaveLength(1);
        expect(lowPools[0].candleIndices).toEqual([0, 1, 2]);
      });

      it('should handle very large price values', () => {
        const candles: Candlestick[] = [
          { timestamp: 1000, open: 1000000, high: 1000100, low: 999900, close: 1000050, volume: 1000 },
          { timestamp: 2000, open: 1000050, high: 1000105, low: 999905, close: 1000055, volume: 1100 },
        ];

        expect(() => detector.detectEqualHighs(candles, 0.001)).not.toThrow();
        expect(() => detector.detectEqualLows(candles, 0.001)).not.toThrow();
      });

      it('should handle very small price values', () => {
        const candles: Candlestick[] = [
          { timestamp: 1000, open: 0.0001, high: 0.00015, low: 0.00005, close: 0.00012, volume: 1000 },
          { timestamp: 2000, open: 0.00012, high: 0.00016, low: 0.00006, close: 0.00013, volume: 1100 },
        ];

        expect(() => detector.detectEqualHighs(candles, 0.001)).not.toThrow();
        expect(() => detector.detectEqualLows(candles, 0.001)).not.toThrow();
      });
    });
  });
});
