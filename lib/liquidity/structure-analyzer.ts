/**
 * StructureAnalyzer - Анализ структуры рынка
 * 
 * Определяет Change of Character (CHOCH) и Break of Structure (BOS):
 * - CHOCH: Смена тренда (uptrend → downtrend или наоборот)
 * - BOS: Продолжение тренда с пробоем структуры
 */

import { Candlestick, StructureChange, SwingPoint, TrendType } from './types';

function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class StructureAnalyzer {
  private swingLookback: number;

  constructor(swingLookback: number = 20) {
    this.swingLookback = swingLookback;
  }

  /**
   * Анализирует структуру рынка и определяет CHOCH/BOS
   * @param candles - Массив свечей
   * @returns Массив структурных изменений
   */
  analyzeStructure(candles: Candlestick[]): StructureChange[] {
    if (candles.length < this.swingLookback) {
      return [];
    }

    const changes: StructureChange[] = [];
    const swingPoints = this.identifySwingPoints(candles);
    
    if (swingPoints.length < 4) {
      return [];
    }

    // Определяем текущий тренд
    let currentTrend = this.determineTrend(swingPoints.slice(0, 4));

    // Проходим по swing points и ищем изменения структуры
    for (let i = 4; i < swingPoints.length; i++) {
      const recentSwings = swingPoints.slice(i - 3, i + 1);
      const newTrend = this.determineTrend(recentSwings);

      if (newTrend !== currentTrend && newTrend !== 'range') {
        // Определяем тип изменения
        const changeType = this.classifyStructureChange(currentTrend, newTrend);
        const swing = swingPoints[i];

        changes.push({
          id: uuidv4(),
          type: changeType,
          direction: newTrend === 'uptrend' ? 'up' : 'down',
          price: swing.price,
          timestamp: candles[swing.candleIndex].timestamp,
          candleIndex: swing.candleIndex,
          previousStructure: currentTrend,
          significance: this.calculateSignificance(recentSwings),
        });

        currentTrend = newTrend;
      }
    }

    return changes;
  }

  /**
   * Определяет swing points (локальные максимумы и минимумы)
   */
  private identifySwingPoints(candles: Candlestick[]): SwingPoint[] {
    const swingPoints: SwingPoint[] = [];
    const lookback = 2; // Смотрим по 2 свечи в каждую сторону

    for (let i = lookback; i < candles.length - lookback; i++) {
      const candle = candles[i];

      // Проверка на swing high
      let isSwingHigh = true;
      for (let j = 1; j <= lookback; j++) {
        if (candle.high <= candles[i - j].high || candle.high <= candles[i + j].high) {
          isSwingHigh = false;
          break;
        }
      }

      if (isSwingHigh) {
        swingPoints.push({
          type: 'high',
          price: candle.high,
          candleIndex: i,
        });
      }

      // Проверка на swing low
      let isSwingLow = true;
      for (let j = 1; j <= lookback; j++) {
        if (candle.low >= candles[i - j].low || candle.low >= candles[i + j].low) {
          isSwingLow = false;
          break;
        }
      }

      if (isSwingLow) {
        swingPoints.push({
          type: 'low',
          price: candle.low,
          candleIndex: i,
        });
      }
    }

    return swingPoints;
  }

  /**
   * Определяет тренд на основе swing points
   */
  private determineTrend(swingPoints: SwingPoint[]): TrendType {
    if (swingPoints.length < 4) {
      return 'range';
    }

    const highs = swingPoints.filter(s => s.type === 'high');
    const lows = swingPoints.filter(s => s.type === 'low');

    if (highs.length < 2 || lows.length < 2) {
      return 'range';
    }

    // Uptrend: Higher Highs (HH) и Higher Lows (HL)
    const lastTwoHighs = highs.slice(-2);
    const lastTwoLows = lows.slice(-2);

    const higherHighs = lastTwoHighs[1].price > lastTwoHighs[0].price;
    const higherLows = lastTwoLows[1].price > lastTwoLows[0].price;

    if (higherHighs && higherLows) {
      return 'uptrend';
    }

    // Downtrend: Lower Highs (LH) и Lower Lows (LL)
    const lowerHighs = lastTwoHighs[1].price < lastTwoHighs[0].price;
    const lowerLows = lastTwoLows[1].price < lastTwoLows[0].price;

    if (lowerHighs && lowerLows) {
      return 'downtrend';
    }

    return 'range';
  }

  /**
   * Классифицирует изменение структуры как CHOCH или BOS
   */
  private classifyStructureChange(
    previousTrend: TrendType,
    newTrend: TrendType
  ): 'CHOCH' | 'BOS' {
    // CHOCH: Смена направления тренда
    if (
      (previousTrend === 'uptrend' && newTrend === 'downtrend') ||
      (previousTrend === 'downtrend' && newTrend === 'uptrend')
    ) {
      return 'CHOCH';
    }

    // BOS: Продолжение тренда после range
    return 'BOS';
  }

  /**
   * Рассчитывает значимость изменения структуры
   */
  private calculateSignificance(swingPoints: SwingPoint[]): number {
    if (swingPoints.length < 2) {
      return 0;
    }

    // Рассчитываем размер движения
    const prices = swingPoints.map(s => s.price);
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const priceRange = maxPrice - minPrice;

    // Нормализуем к 0-1
    const avgPrice = (maxPrice + minPrice) / 2;
    const significance = priceRange / avgPrice;

    // Ограничиваем до 1
    return Math.min(significance, 1);
  }

  /**
   * Проверяет, произошёл ли BOS на текущей свече
   */
  checkForBOS(
    candle: Candlestick,
    swingPoints: SwingPoint[],
    currentTrend: TrendType
  ): boolean {
    if (swingPoints.length < 2) {
      return false;
    }

    if (currentTrend === 'uptrend') {
      // BOS вверх: пробой последнего swing high
      const lastHigh = swingPoints
        .filter(s => s.type === 'high')
        .slice(-1)[0];
      
      return lastHigh && candle.close > lastHigh.price;
    } else if (currentTrend === 'downtrend') {
      // BOS вниз: пробой последнего swing low
      const lastLow = swingPoints
        .filter(s => s.type === 'low')
        .slice(-1)[0];
      
      return lastLow && candle.close < lastLow.price;
    }

    return false;
  }
}
