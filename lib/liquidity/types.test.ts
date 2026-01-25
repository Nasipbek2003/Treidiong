/**
 * Basic tests to verify type definitions and Jest setup
 */

import {
  Candlestick,
  LiquidityPool,
  LiquiditySweep,
  StructureChange,
  SignalScore,
  TradingSignal,
  LiquidityConfig,
} from './types';

describe('Liquidity Engine Types', () => {
  describe('Type Definitions', () => {
    it('should allow creating a valid Candlestick', () => {
      const candle: Candlestick = {
        timestamp: Date.now(),
        open: 100,
        high: 105,
        low: 95,
        close: 102,
        volume: 1000,
      };

      expect(candle.high).toBeGreaterThanOrEqual(candle.open);
      expect(candle.high).toBeGreaterThanOrEqual(candle.close);
      expect(candle.low).toBeLessThanOrEqual(candle.open);
      expect(candle.low).toBeLessThanOrEqual(candle.close);
    });

    it('should allow creating a valid LiquidityPool', () => {
      const pool: LiquidityPool = {
        id: 'pool-1',
        type: 'equal_highs',
        price: 100,
        timestamp: Date.now(),
        status: 'active',
        candleIndices: [0, 1, 2],
        strength: 3,
      };

      expect(pool.status).toBe('active');
      expect(pool.candleIndices.length).toBe(3);
    });

    it('should allow creating a valid LiquiditySweep', () => {
      const sweep: LiquiditySweep = {
        id: 'sweep-1',
        poolId: 'pool-1',
        poolType: 'equal_highs',
        sweepPrice: 100,
        sweepTimestamp: Date.now(),
        candleIndex: 5,
        wickSize: 0.6,
        direction: 'up',
        rejectionStrength: 0.7,
      };

      expect(sweep.wickSize).toBeGreaterThan(0.5);
      expect(sweep.direction).toBe('up');
    });

    it('should allow creating a valid StructureChange', () => {
      const change: StructureChange = {
        id: 'change-1',
        type: 'CHOCH',
        direction: 'down',
        price: 100,
        timestamp: Date.now(),
        candleIndex: 10,
        previousStructure: 'uptrend',
        significance: 0.8,
      };

      expect(change.type).toBe('CHOCH');
      expect(change.previousStructure).toBe('uptrend');
    });

    it('should allow creating a valid SignalScore', () => {
      const score: SignalScore = {
        totalScore: 75,
        breakdown: {
          sweepScore: 25,
          bosScore: 30,
          divergenceScore: 15,
          volumeScore: 0,
          htfScore: 0,
        },
        components: ['Liquidity Sweep', 'BOS down', 'RSI Divergence'],
      };

      expect(score.totalScore).toBeGreaterThanOrEqual(0);
      expect(score.totalScore).toBeLessThanOrEqual(100);
    });

    it('should allow creating a valid TradingSignal', () => {
      const signal: TradingSignal = {
        id: 'signal-1',
        symbol: 'BTCUSDT',
        direction: 'SELL',
        score: {
          totalScore: 75,
          breakdown: {
            sweepScore: 25,
            bosScore: 30,
            divergenceScore: 15,
            volumeScore: 0,
            htfScore: 0,
          },
          components: ['Liquidity Sweep', 'BOS down'],
        },
        timestamp: Date.now(),
        sweepId: 'sweep-1',
        structureChangeId: 'change-1',
        entryPrice: 100,
        stopLoss: 105,
        takeProfit: 90,
        reasoning: 'Liquidity sweep followed by CHOCH down',
      };

      expect(signal.direction).toBe('SELL');
      expect(signal.symbol).toBe('BTCUSDT');
    });

    it('should allow creating a valid LiquidityConfig', () => {
      const config: LiquidityConfig = {
        equalTolerance: 0.001,
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

      expect(config.equalTolerance).toBe(0.001);
      expect(config.scoreWeights.sweep).toBe(25);
    });
  });

  describe('Type Constraints', () => {
    it('should enforce LiquidityPoolType values', () => {
      const validTypes = [
        'equal_highs',
        'equal_lows',
        'pdh',
        'pdl',
        'asian_high',
        'asian_low',
        'range_high',
        'range_low',
        'trendline_high',
        'trendline_low',
      ];

      validTypes.forEach((type) => {
        const pool: LiquidityPool = {
          id: 'test',
          type: type as any,
          price: 100,
          timestamp: Date.now(),
          status: 'active',
          candleIndices: [0],
          strength: 1,
        };
        expect(pool.type).toBe(type);
      });
    });

    it('should enforce Direction values', () => {
      const directions: Array<'up' | 'down'> = ['up', 'down'];

      directions.forEach((dir) => {
        const sweep: LiquiditySweep = {
          id: 'test',
          poolId: 'pool-1',
          poolType: 'equal_highs',
          sweepPrice: 100,
          sweepTimestamp: Date.now(),
          candleIndex: 0,
          wickSize: 0.6,
          direction: dir,
          rejectionStrength: 0.5,
        };
        expect(sweep.direction).toBe(dir);
      });
    });

    it('should enforce SignalDirection values', () => {
      const directions: Array<'BUY' | 'SELL'> = ['BUY', 'SELL'];

      directions.forEach((dir) => {
        const signal: TradingSignal = {
          id: 'test',
          symbol: 'BTCUSDT',
          direction: dir,
          score: {
            totalScore: 50,
            breakdown: {
              sweepScore: 0,
              bosScore: 0,
              divergenceScore: 0,
              volumeScore: 0,
              htfScore: 0,
            },
            components: [],
          },
          timestamp: Date.now(),
          entryPrice: 100,
          stopLoss: 95,
          takeProfit: 110,
          reasoning: 'Test signal',
        };
        expect(signal.direction).toBe(dir);
      });
    });
  });
});
