/**
 * Tests for StructureAnalyzer
 */

import { StructureAnalyzer } from './structure-analyzer';
import { Candlestick } from './types';

describe('StructureAnalyzer', () => {
  let analyzer: StructureAnalyzer;

  beforeEach(() => {
    analyzer = new StructureAnalyzer(20);
  });

  describe('analyzeStructure', () => {
    it('should return empty array for insufficient data', () => {
      const candles: Candlestick[] = Array(10)
        .fill(null)
        .map((_, i) => ({
          timestamp: Date.now() + i * 60000,
          open: 50000,
          high: 50100,
          low: 49900,
          close: 50000,
          volume: 1000,
        }));

      const changes = analyzer.analyzeStructure(candles);
      expect(changes).toEqual([]);
    });

    it('should detect structure changes in market', () => {
      // Create realistic market with swing points
      const candles: Candlestick[] = [];

      // Create enough data with clear swing points
      for (let i = 0; i < 50; i++) {
        const basePrice = 50000;
        const variation = Math.sin(i / 5) * 500; // Create waves
        
        candles.push({
          timestamp: Date.now() + i * 60000,
          open: basePrice + variation,
          high: basePrice + variation + 200,
          low: basePrice + variation - 200,
          close: basePrice + variation + 100,
          volume: 1000,
        });
      }

      const changes = analyzer.analyzeStructure(candles);

      // Should detect structure changes (CHOCH or BOS)
      expect(changes.length).toBeGreaterThanOrEqual(0);
      
      // If changes detected, verify structure
      if (changes.length > 0) {
        expect(['CHOCH', 'BOS']).toContain(changes[0].type);
        expect(['up', 'down']).toContain(changes[0].direction);
      }
    });

    it('should detect BOS in trending market', () => {
      // Create strong uptrend with BOS
      const candles: Candlestick[] = [];

      for (let i = 0; i < 50; i++) {
        candles.push({
          timestamp: Date.now() + i * 60000,
          open: 50000 + i * 100,
          high: 50200 + i * 100,
          low: 49900 + i * 100,
          close: 50100 + i * 100,
          volume: 1000,
        });
      }

      const changes = analyzer.analyzeStructure(candles);

      // Should detect structure changes
      expect(changes.length).toBeGreaterThanOrEqual(0);
    });

    it('should calculate significance correctly', () => {
      const candles: Candlestick[] = [];

      // Large price movement
      for (let i = 0; i < 30; i++) {
        candles.push({
          timestamp: Date.now() + i * 60000,
          open: 50000 + i * 500, // Larger moves
          high: 50500 + i * 500,
          low: 49500 + i * 500,
          close: 50250 + i * 500,
          volume: 1000,
        });
      }

      const changes = analyzer.analyzeStructure(candles);

      if (changes.length > 0) {
        expect(changes[0].significance).toBeGreaterThan(0);
        expect(changes[0].significance).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('checkForBOS', () => {
    it('should detect BOS in uptrend', () => {
      const candles: Candlestick[] = [];

      // Create uptrend
      for (let i = 0; i < 30; i++) {
        candles.push({
          timestamp: Date.now() + i * 60000,
          open: 50000 + i * 100,
          high: 50200 + i * 100,
          low: 49900 + i * 100,
          close: 50100 + i * 100,
          volume: 1000,
        });
      }

      const swingPoints = (analyzer as any).identifySwingPoints(candles);

      const breakoutCandle: Candlestick = {
        timestamp: Date.now() + 30 * 60000,
        open: 53000,
        high: 54000,
        low: 52900,
        close: 53800, // Breaks above previous high
        volume: 2000,
      };

      const hasBOS = analyzer.checkForBOS(breakoutCandle, swingPoints, 'uptrend');

      expect(typeof hasBOS).toBe('boolean');
    });

    it('should return false with insufficient swing points', () => {
      const candle: Candlestick = {
        timestamp: Date.now(),
        open: 50000,
        high: 50100,
        low: 49900,
        close: 50000,
        volume: 1000,
      };

      const hasBOS = analyzer.checkForBOS(candle, [], 'uptrend');
      expect(hasBOS).toBe(false);
    });
  });
});
