/**
 * Tests for SignalScorer
 */

import { SignalScorer } from './signal-scorer';
import { LiquiditySweep, StructureChange, Candlestick, LiquidityPool } from './types';

describe('SignalScorer', () => {
  let scorer: SignalScorer;

  beforeEach(() => {
    scorer = new SignalScorer();
  });

  describe('calculateScore', () => {
    it('should calculate score with sweep only', () => {
      const sweep: LiquiditySweep = {
        id: '1',
        poolId: 'pool1',
        poolType: 'equal_highs',
        sweepPrice: 50000,
        sweepTimestamp: Date.now(),
        candleIndex: 10,
        wickSize: 0.6,
        direction: 'up',
        rejectionStrength: 0.7,
      };

      const candle: Candlestick = {
        timestamp: Date.now(),
        open: 49000,
        high: 50000,
        low: 48500,
        close: 49500,
        volume: 1000,
      };

      const score = scorer.calculateScore(sweep, null, candle, [], [], []);

      expect(score.totalScore).toBeGreaterThan(0);
      expect(score.breakdown.sweepScore).toBeGreaterThan(0);
      expect(score.breakdown.bosScore).toBe(0);
      expect(score.components.length).toBeGreaterThan(0);
    });

    it('should calculate score with BOS only', () => {
      const structureChange: StructureChange = {
        id: '1',
        type: 'BOS',
        direction: 'up',
        price: 50000,
        timestamp: Date.now(),
        candleIndex: 10,
        previousStructure: 'uptrend',
        significance: 0.8,
      };

      const candle: Candlestick = {
        timestamp: Date.now(),
        open: 49000,
        high: 50000,
        low: 48500,
        close: 49500,
        volume: 1000,
      };

      const score = scorer.calculateScore(null, structureChange, candle, [], [], []);

      expect(score.totalScore).toBeGreaterThan(0);
      expect(score.breakdown.bosScore).toBeGreaterThan(0);
      expect(score.breakdown.sweepScore).toBe(0);
    });

    it('should give higher score for CHOCH than BOS', () => {
      const bos: StructureChange = {
        id: '1',
        type: 'BOS',
        direction: 'up',
        price: 50000,
        timestamp: Date.now(),
        candleIndex: 10,
        previousStructure: 'uptrend',
        significance: 0.8,
      };

      const choch: StructureChange = {
        ...bos,
        type: 'CHOCH',
      };

      const candle: Candlestick = {
        timestamp: Date.now(),
        open: 49000,
        high: 50000,
        low: 48500,
        close: 49500,
        volume: 1000,
      };

      const bosScore = scorer.calculateScore(null, bos, candle, [], [], []);
      const chochScore = scorer.calculateScore(null, choch, candle, [], [], []);

      expect(chochScore.breakdown.bosScore).toBeGreaterThan(bosScore.breakdown.bosScore);
    });

    it('should add volume score when volume spike detected', () => {
      const candle: Candlestick = {
        timestamp: Date.now(),
        open: 49000,
        high: 50000,
        low: 48500,
        close: 49500,
        volume: 3000, // 3x average
      };

      const volumeData = Array(20).fill(1000);

      const score = scorer.calculateScore(null, null, candle, volumeData, [], []);

      expect(score.breakdown.volumeScore).toBeGreaterThan(0);
    });

    it('should add HTF score when near HTF level', () => {
      const candle: Candlestick = {
        timestamp: Date.now(),
        open: 49000,
        high: 50000,
        low: 48500,
        close: 49500,
        volume: 1000,
      };

      const htfPool: LiquidityPool = {
        id: '1',
        type: 'pdh',
        price: 49550, // Very close to candle close
        timestamp: Date.now(),
        status: 'active',
        candleIndices: [0],
        strength: 1,
      };

      const score = scorer.calculateScore(null, null, candle, [], [], [htfPool]);

      expect(score.breakdown.htfScore).toBeGreaterThan(0);
    });

    it('should combine all score components', () => {
      const sweep: LiquiditySweep = {
        id: '1',
        poolId: 'pool1',
        poolType: 'equal_highs',
        sweepPrice: 50000,
        sweepTimestamp: Date.now(),
        candleIndex: 10,
        wickSize: 0.6,
        direction: 'up',
        rejectionStrength: 0.7,
      };

      const structureChange: StructureChange = {
        id: '1',
        type: 'CHOCH',
        direction: 'up',
        price: 50000,
        timestamp: Date.now(),
        candleIndex: 10,
        previousStructure: 'downtrend',
        significance: 0.8,
      };

      const candle: Candlestick = {
        timestamp: Date.now(),
        open: 49000,
        high: 50000,
        low: 48500,
        close: 49500,
        volume: 3000,
      };

      const volumeData = Array(20).fill(1000);

      const htfPool: LiquidityPool = {
        id: '1',
        type: 'pdh',
        price: 49550,
        timestamp: Date.now(),
        status: 'active',
        candleIndices: [0],
        strength: 1,
      };

      const score = scorer.calculateScore(
        sweep,
        structureChange,
        candle,
        volumeData,
        [],
        [htfPool]
      );

      expect(score.totalScore).toBeGreaterThan(50);
      expect(score.breakdown.sweepScore).toBeGreaterThan(0);
      expect(score.breakdown.bosScore).toBeGreaterThan(0);
      expect(score.breakdown.volumeScore).toBeGreaterThan(0);
      expect(score.breakdown.htfScore).toBeGreaterThan(0);
      expect(score.components.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('generateScoreExplanation', () => {
    it('should generate readable explanation', () => {
      const score = {
        totalScore: 75.5,
        breakdown: {
          sweepScore: 20,
          bosScore: 25,
          divergenceScore: 10,
          volumeScore: 8,
          htfScore: 12.5,
        },
        components: ['Sweep', 'BOS', 'Volume'],
      };

      const explanation = scorer.generateScoreExplanation(score);

      expect(explanation).toContain('75.5');
      expect(explanation).toContain('Breakdown');
      expect(explanation).toContain('Liquidity Sweep');
      expect(explanation).toContain('Structure Change');
    });
  });
});
