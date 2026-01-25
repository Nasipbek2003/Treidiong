/**
 * Liquidity Pool Detector
 * 
 * Identifies zones of liquidity concentration where stop-losses are likely clustered.
 * Detects various types of liquidity pools including Equal Highs/Lows, Previous Day High/Low,
 * Asian Range, Range High/Low, and Trendline High/Low.
 */

import { Candlestick, LiquidityPool, LiquidityConfig } from './types';

/**
 * Simple UUID v4 generator
 */
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * LiquidityPoolDetector class for identifying liquidity zones
 */
export class LiquidityPoolDetector {
  private config: LiquidityConfig;

  constructor(config: LiquidityConfig) {
    this.config = config;
  }

  /**
   * Detect Equal Highs - 2+ candles with similar high prices within tolerance
   * Algorithm from design.md:
   * 1. For each candle i, find all candles j where |high[j] - high[i]| <= tolerance * high[i]
   * 2. If found >= 2 candles, create LiquidityPool
   * 3. Remove duplicates
   * 
   * @param candles - Array of candlestick data
   * @param tolerance - Price tolerance as decimal (e.g., 0.001 = 0.1%)
   * @returns Array of detected Equal Highs pools
   */
  detectEqualHighs(candles: Candlestick[], tolerance: number): LiquidityPool[] {
    if (!candles || candles.length < 2) {
      return [];
    }

    const pools: LiquidityPool[] = [];
    const processed = new Set<number>();

    for (let i = 0; i < candles.length; i++) {
      if (processed.has(i)) continue;

      const targetHigh = candles[i].high;
      const matchingIndices: number[] = [];

      // Find all candles with similar highs
      for (let j = 0; j < candles.length; j++) {
        if (processed.has(j)) continue;

        const priceDiff = Math.abs(candles[j].high - targetHigh);
        const toleranceAmount = tolerance * targetHigh;

        if (priceDiff <= toleranceAmount) {
          matchingIndices.push(j);
        }
      }

      // Need at least 2 candles to form a pool
      if (matchingIndices.length >= 2) {
        // Mark all indices as processed
        matchingIndices.forEach(idx => processed.add(idx));

        // Calculate average price of all matching highs
        const prices = matchingIndices.map(idx => candles[idx].high);
        const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;

        pools.push({
          id: uuidv4(),
          type: 'equal_highs',
          price: avgPrice,
          timestamp: candles[matchingIndices[0]].timestamp,
          status: 'active',
          candleIndices: matchingIndices,
          strength: matchingIndices.length,
        });
      }
    }

    return pools;
  }

  /**
   * Detect Equal Lows - 2+ candles with similar low prices within tolerance
   * Algorithm mirrors detectEqualHighs but for low prices
   * 
   * @param candles - Array of candlestick data
   * @param tolerance - Price tolerance as decimal (e.g., 0.001 = 0.1%)
   * @returns Array of detected Equal Lows pools
   */
  detectEqualLows(candles: Candlestick[], tolerance: number): LiquidityPool[] {
    if (!candles || candles.length < 2) {
      return [];
    }

    const pools: LiquidityPool[] = [];
    const processed = new Set<number>();

    for (let i = 0; i < candles.length; i++) {
      if (processed.has(i)) continue;

      const targetLow = candles[i].low;
      const matchingIndices: number[] = [];

      // Find all candles with similar lows
      for (let j = 0; j < candles.length; j++) {
        if (processed.has(j)) continue;

        const priceDiff = Math.abs(candles[j].low - targetLow);
        const toleranceAmount = tolerance * targetLow;

        if (priceDiff <= toleranceAmount) {
          matchingIndices.push(j);
        }
      }

      // Need at least 2 candles to form a pool
      if (matchingIndices.length >= 2) {
        // Mark all indices as processed
        matchingIndices.forEach(idx => processed.add(idx));

        // Calculate average price of all matching lows
        const prices = matchingIndices.map(idx => candles[idx].low);
        const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;

        pools.push({
          id: uuidv4(),
          type: 'equal_lows',
          price: avgPrice,
          timestamp: candles[matchingIndices[0]].timestamp,
          status: 'active',
          candleIndices: matchingIndices,
          strength: matchingIndices.length,
        });
      }
    }

    return pools;
  }

  /**
   * Detect Previous Day High and Low
   * Identifies the highest high and lowest low from the previous trading day
   * 
   * @param candles - Array of candlestick data
   * @returns Array containing PDH and PDL pools
   */
  detectPreviousDayHighLow(candles: Candlestick[]): LiquidityPool[] {
    if (!candles || candles.length === 0) {
      return [];
    }

    const pools: LiquidityPool[] = [];
    const dayGroups = new Map<string, Candlestick[]>();

    // Group candles by day
    for (let i = 0; i < candles.length; i++) {
      const date = new Date(candles[i].timestamp);
      const dayKey = `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;

      if (!dayGroups.has(dayKey)) {
        dayGroups.set(dayKey, []);
      }
      dayGroups.get(dayKey)!.push(candles[i]);
    }

    // Convert to array and sort by date
    const sortedDays = Array.from(dayGroups.entries()).sort((a, b) => {
      const dateA = new Date(a[1][0].timestamp);
      const dateB = new Date(b[1][0].timestamp);
      return dateA.getTime() - dateB.getTime();
    });

    // For each day (except the first), create PDH/PDL from previous day
    for (let i = 1; i < sortedDays.length; i++) {
      const previousDayCandles = sortedDays[i - 1][1];
      const currentDayFirstCandle = sortedDays[i][1][0];

      // Find highest high and lowest low from previous day
      let pdh = previousDayCandles[0].high;
      let pdl = previousDayCandles[0].low;
      const pdhIndices: number[] = [];
      const pdlIndices: number[] = [];

      for (let j = 0; j < previousDayCandles.length; j++) {
        const candle = previousDayCandles[j];
        const globalIndex = candles.indexOf(candle);

        if (candle.high > pdh) {
          pdh = candle.high;
          pdhIndices.length = 0;
          pdhIndices.push(globalIndex);
        } else if (candle.high === pdh) {
          pdhIndices.push(globalIndex);
        }

        if (candle.low < pdl) {
          pdl = candle.low;
          pdlIndices.length = 0;
          pdlIndices.push(globalIndex);
        } else if (candle.low === pdl) {
          pdlIndices.push(globalIndex);
        }
      }

      // Create PDH pool
      pools.push({
        id: uuidv4(),
        type: 'pdh',
        price: pdh,
        timestamp: currentDayFirstCandle.timestamp,
        status: 'active',
        candleIndices: pdhIndices,
        strength: 1,
      });

      // Create PDL pool
      pools.push({
        id: uuidv4(),
        type: 'pdl',
        price: pdl,
        timestamp: currentDayFirstCandle.timestamp,
        status: 'active',
        candleIndices: pdlIndices,
        strength: 1,
      });
    }

    return pools;
  }

  /**
   * Detect Asian Range High and Low (00:00-08:00 UTC)
   * Algorithm from design.md:
   * 1. Filter candles in Asian session (00:00-08:00 UTC)
   * 2. Find max high (Asian High) and min low (Asian Low)
   * 3. Create two pools
   * 
   * @param candles - Array of candlestick data
   * @returns Array containing Asian High and Asian Low pools
   */
  detectAsianRange(candles: Candlestick[]): LiquidityPool[] {
    if (!candles || candles.length === 0) {
      return [];
    }

    const pools: LiquidityPool[] = [];
    const asianSessions = new Map<string, Candlestick[]>();

    // Group candles by Asian session (00:00-08:00 UTC)
    for (let i = 0; i < candles.length; i++) {
      const date = new Date(candles[i].timestamp);
      const hour = date.getUTCHours();

      // Asian session: 00:00-08:00 UTC
      if (hour >= 0 && hour < 8) {
        const sessionKey = `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;

        if (!asianSessions.has(sessionKey)) {
          asianSessions.set(sessionKey, []);
        }
        asianSessions.get(sessionKey)!.push(candles[i]);
      }
    }

    // For each Asian session, find high and low
    for (const [sessionKey, sessionCandles] of asianSessions.entries()) {
      if (sessionCandles.length === 0) continue;

      let asianHigh = sessionCandles[0].high;
      let asianLow = sessionCandles[0].low;
      const highIndices: number[] = [];
      const lowIndices: number[] = [];

      for (let j = 0; j < sessionCandles.length; j++) {
        const candle = sessionCandles[j];
        const globalIndex = candles.indexOf(candle);

        if (candle.high > asianHigh) {
          asianHigh = candle.high;
          highIndices.length = 0;
          highIndices.push(globalIndex);
        } else if (candle.high === asianHigh) {
          highIndices.push(globalIndex);
        }

        if (candle.low < asianLow) {
          asianLow = candle.low;
          lowIndices.length = 0;
          lowIndices.push(globalIndex);
        } else if (candle.low === asianLow) {
          lowIndices.push(globalIndex);
        }
      }

      // Create Asian High pool
      pools.push({
        id: uuidv4(),
        type: 'asian_high',
        price: asianHigh,
        timestamp: sessionCandles[0].timestamp,
        status: 'active',
        candleIndices: highIndices,
        strength: 1,
      });

      // Create Asian Low pool
      pools.push({
        id: uuidv4(),
        type: 'asian_low',
        price: asianLow,
        timestamp: sessionCandles[0].timestamp,
        status: 'active',
        candleIndices: lowIndices,
        strength: 1,
      });
    }

    return pools;
  }

  /**
   * Detect Range High and Low
   * Identifies horizontal support/resistance levels with minimum number of touches
   * 
   * @param candles - Array of candlestick data
   * @param minTouches - Minimum number of touches required (default from config)
   * @returns Array containing Range High and Range Low pools
   */
  detectRangeHighLow(candles: Candlestick[], minTouches: number): LiquidityPool[] {
    if (!candles || candles.length < minTouches) {
      return [];
    }

    const pools: LiquidityPool[] = [];
    const tolerance = this.config.equalTolerance;

    // Find potential range highs (resistance levels)
    const highClusters = this.findPriceClusters(
      candles.map((c, i) => ({ price: c.high, index: i })),
      tolerance,
      minTouches
    );

    for (const cluster of highClusters) {
      pools.push({
        id: uuidv4(),
        type: 'range_high',
        price: cluster.avgPrice,
        timestamp: candles[cluster.indices[0]].timestamp,
        status: 'active',
        candleIndices: cluster.indices,
        strength: cluster.indices.length,
      });
    }

    // Find potential range lows (support levels)
    const lowClusters = this.findPriceClusters(
      candles.map((c, i) => ({ price: c.low, index: i })),
      tolerance,
      minTouches
    );

    for (const cluster of lowClusters) {
      pools.push({
        id: uuidv4(),
        type: 'range_low',
        price: cluster.avgPrice,
        timestamp: candles[cluster.indices[0]].timestamp,
        status: 'active',
        candleIndices: cluster.indices,
        strength: cluster.indices.length,
      });
    }

    return pools;
  }

  /**
   * Detect Trendline High and Low
   * Identifies extreme highs and lows in trending markets
   * 
   * @param candles - Array of candlestick data
   * @returns Array containing Trendline High and Trendline Low pools
   */
  detectTrendlineHighLow(candles: Candlestick[]): LiquidityPool[] {
    if (!candles || candles.length < 3) {
      return [];
    }

    const pools: LiquidityPool[] = [];
    const lookback = Math.min(this.config.swingLookback, candles.length);

    // Find swing highs and lows
    const swingHighs: { price: number; index: number }[] = [];
    const swingLows: { price: number; index: number }[] = [];

    for (let i = 2; i < candles.length - 2; i++) {
      const candle = candles[i];

      // Check for swing high
      if (
        candle.high > candles[i - 1].high &&
        candle.high > candles[i - 2].high &&
        candle.high > candles[i + 1].high &&
        candle.high > candles[i + 2].high
      ) {
        swingHighs.push({ price: candle.high, index: i });
      }

      // Check for swing low
      if (
        candle.low < candles[i - 1].low &&
        candle.low < candles[i - 2].low &&
        candle.low < candles[i + 1].low &&
        candle.low < candles[i + 2].low
      ) {
        swingLows.push({ price: candle.low, index: i });
      }
    }

    // Identify trendline high (highest swing high in recent period)
    if (swingHighs.length > 0) {
      const recentSwingHighs = swingHighs.slice(-lookback);
      const maxSwingHigh = recentSwingHighs.reduce((max, curr) =>
        curr.price > max.price ? curr : max
      );

      pools.push({
        id: uuidv4(),
        type: 'trendline_high',
        price: maxSwingHigh.price,
        timestamp: candles[maxSwingHigh.index].timestamp,
        status: 'active',
        candleIndices: [maxSwingHigh.index],
        strength: 1,
      });
    }

    // Identify trendline low (lowest swing low in recent period)
    if (swingLows.length > 0) {
      const recentSwingLows = swingLows.slice(-lookback);
      const minSwingLow = recentSwingLows.reduce((min, curr) =>
        curr.price < min.price ? curr : min
      );

      pools.push({
        id: uuidv4(),
        type: 'trendline_low',
        price: minSwingLow.price,
        timestamp: candles[minSwingLow.index].timestamp,
        status: 'active',
        candleIndices: [minSwingLow.index],
        strength: 1,
      });
    }

    return pools;
  }

  /**
   * Get all liquidity pools by running all detection methods
   * 
   * @param candles - Array of candlestick data
   * @returns Array of all detected liquidity pools
   */
  getAllPools(candles: Candlestick[]): LiquidityPool[] {
    const allPools: LiquidityPool[] = [];

    // Detect all types of pools
    allPools.push(...this.detectEqualHighs(candles, this.config.equalTolerance));
    allPools.push(...this.detectEqualLows(candles, this.config.equalTolerance));
    allPools.push(...this.detectPreviousDayHighLow(candles));
    allPools.push(...this.detectAsianRange(candles));
    allPools.push(...this.detectRangeHighLow(candles, this.config.minRangeTouches));
    allPools.push(...this.detectTrendlineHighLow(candles));

    return allPools;
  }

  /**
   * Helper method to find price clusters
   * Groups prices that are within tolerance of each other
   * 
   * @param pricePoints - Array of price points with indices
   * @param tolerance - Price tolerance as decimal
   * @param minCount - Minimum number of points to form a cluster
   * @returns Array of price clusters
   */
  private findPriceClusters(
    pricePoints: { price: number; index: number }[],
    tolerance: number,
    minCount: number
  ): { avgPrice: number; indices: number[] }[] {
    const clusters: { avgPrice: number; indices: number[] }[] = [];
    const processed = new Set<number>();

    for (let i = 0; i < pricePoints.length; i++) {
      if (processed.has(i)) continue;

      const targetPrice = pricePoints[i].price;
      const clusterIndices: number[] = [];

      for (let j = 0; j < pricePoints.length; j++) {
        const priceDiff = Math.abs(pricePoints[j].price - targetPrice);
        const toleranceAmount = tolerance * targetPrice;

        if (priceDiff <= toleranceAmount) {
          clusterIndices.push(pricePoints[j].index);
          processed.add(j);
        }
      }

      if (clusterIndices.length >= minCount) {
        const prices = clusterIndices.map(idx => {
          const point = pricePoints.find(p => p.index === idx);
          return point ? point.price : 0;
        });
        const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;

        clusters.push({
          avgPrice,
          indices: clusterIndices,
        });
      }
    }

    return clusters;
  }
}
