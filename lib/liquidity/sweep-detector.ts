/**
 * SweepDetector - Детекция сбора ликвидности (stop hunt)
 * 
 * Определяет ситуации, когда цена пробивает liquidity pool,
 * но закрывается обратно внутри диапазона с длинным фитилём (>50%).
 * Это признак сбора ликвидности Smart Money.
 */

import { Candlestick, LiquidityPool, LiquiditySweep } from './types';
import { randomUUID } from 'crypto';

export class SweepDetector {
  /**
   * Детектирует liquidity sweep для данной свечи
   * @param candle - Свеча для анализа
   * @param activePools - Активные liquidity pools
   * @returns LiquiditySweep или null если sweep не обнаружен
   */
  detectSweep(
    candle: Candlestick,
    activePools: LiquidityPool[]
  ): LiquiditySweep | null {
    for (const pool of activePools) {
      // Проверяем пробой
      const hasBreakout = this.checkBreakout(candle, pool);
      if (!hasBreakout) continue;

      // Проверяем условия sweep
      if (this.validateSweepConditions(candle, pool)) {
        return this.createSweep(candle, pool);
      }
    }

    return null;
  }

  /**
   * Проверяет, пробила ли свеча liquidity pool
   */
  private checkBreakout(candle: Candlestick, pool: LiquidityPool): boolean {
    const highTypes = ['equal_highs', 'pdh', 'asian_high', 'range_high', 'trendline_high'];
    const lowTypes = ['equal_lows', 'pdl', 'asian_low', 'range_low', 'trendline_low'];

    if (highTypes.includes(pool.type)) {
      return candle.high > pool.price;
    } else if (lowTypes.includes(pool.type)) {
      return candle.low < pool.price;
    }

    return false;
  }

  /**
   * Валидирует условия для liquidity sweep
   * @param candle - Свеча для проверки
   * @param pool - Пробитый pool
   * @returns true если все условия sweep выполнены
   */
  validateSweepConditions(
    candle: Candlestick,
    pool: LiquidityPool
  ): boolean {
    const highTypes = ['equal_highs', 'pdh', 'asian_high', 'range_high', 'trendline_high'];
    const lowTypes = ['equal_lows', 'pdl', 'asian_low', 'range_low', 'trendline_low'];
    
    const isHighPool = highTypes.includes(pool.type);
    const isLowPool = lowTypes.includes(pool.type);

    // Проверка закрытия обратно внутри
    let closedInside = false;
    if (isHighPool) {
      closedInside = candle.close < pool.price;
    } else if (isLowPool) {
      closedInside = candle.close > pool.price;
    }

    if (!closedInside) return false;

    // Расчёт размера фитиля
    const wickSize = this.calculateWickSize(candle, isHighPool);

    // Фитиль должен быть > 50%
    return wickSize > 0.5;
  }

  /**
   * Рассчитывает размер фитиля в процентах от размера свечи
   */
  private calculateWickSize(candle: Candlestick, isHighSweep: boolean): number {
    const candleRange = candle.high - candle.low;
    if (candleRange === 0) return 0;

    if (isHighSweep) {
      // Для sweep high: размер верхнего фитиля
      return (candle.high - candle.close) / candleRange;
    } else {
      // Для sweep low: размер нижнего фитиля
      return (candle.close - candle.low) / candleRange;
    }
  }

  /**
   * Рассчитывает силу отката (размер тела свечи после sweep)
   */
  private calculateRejectionStrength(candle: Candlestick): number {
    const candleRange = candle.high - candle.low;
    if (candleRange === 0) return 0;

    const bodySize = Math.abs(candle.close - candle.open);
    return bodySize / candleRange;
  }

  /**
   * Создаёт объект LiquiditySweep
   */
  private createSweep(
    candle: Candlestick,
    pool: LiquidityPool
  ): LiquiditySweep {
    const highTypes = ['equal_highs', 'pdh', 'asian_high', 'range_high', 'trendline_high'];
    const isHighPool = highTypes.includes(pool.type);
    
    const wickSize = this.calculateWickSize(candle, isHighPool);
    const rejectionStrength = this.calculateRejectionStrength(candle);

    return {
      id: randomUUID(),
      poolId: pool.id,
      poolType: pool.type,
      sweepPrice: isHighPool ? candle.high : candle.low,
      sweepTimestamp: candle.timestamp,
      candleIndex: -1, // Будет установлен при сохранении
      wickSize,
      direction: isHighPool ? 'up' : 'down',
      rejectionStrength,
    };
  }
}
