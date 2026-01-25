/**
 * BreakoutValidator - Фильтрация ложных пробоев
 * 
 * Проверяет валидность пробоев уровней ликвидности по нескольким критериям:
 * - Объём (volume spike)
 * - Закрытие за уровнем
 * - Размер фитиля
 * - RSI дивергенция
 */

import { Candlestick, LiquidityPool } from './types';

export interface BreakoutValidation {
  isValid: boolean;
  reasons: string[]; // причины невалидности
  volumeCheck: boolean;
  closeCheck: boolean;
  wickCheck: boolean;
  divergenceCheck: boolean;
}

export class BreakoutValidator {
  private volumeSpikeMultiplier: number;

  constructor(volumeSpikeMultiplier: number = 1.5) {
    this.volumeSpikeMultiplier = volumeSpikeMultiplier;
  }

  /**
   * Валидирует пробой уровня ликвидности
   * @param candle - Свеча с пробоем
   * @param pool - Пробитый liquidity pool
   * @param volumeData - Исторические данные объёма
   * @param rsiData - Исторические данные RSI
   * @returns Результат валидации
   */
  validateBreakout(
    candle: Candlestick,
    pool: LiquidityPool,
    volumeData: number[],
    rsiData: number[]
  ): BreakoutValidation {
    const validation: BreakoutValidation = {
      isValid: true,
      reasons: [],
      volumeCheck: true,
      closeCheck: true,
      wickCheck: true,
      divergenceCheck: true,
    };

    // Определяем направление пробоя
    const highTypes = ['equal_highs', 'pdh', 'asian_high', 'range_high', 'trendline_high'];
    const isHighBreakout = highTypes.includes(pool.type);

    // 1. Проверка объёма
    if (volumeData.length > 0) {
      const avgVolume = this.calculateAverageVolume(volumeData);
      if (!this.checkVolumeSpike(candle.volume, avgVolume)) {
        validation.volumeCheck = false;
        validation.reasons.push('Недостаточный объём');
        validation.isValid = false;
      }
    }

    // 2. Проверка закрытия за уровнем
    if (isHighBreakout) {
      if (candle.close <= pool.price) {
        validation.closeCheck = false;
        validation.reasons.push('Нет закрытия за уровнем');
        validation.isValid = false;
      }
    } else {
      if (candle.close >= pool.price) {
        validation.closeCheck = false;
        validation.reasons.push('Нет закрытия за уровнем');
        validation.isValid = false;
      }
    }

    // 3. Проверка фитиля
    const wickRatio = this.calculateWickRatio(candle, isHighBreakout);
    if (wickRatio > 0.5) {
      validation.wickCheck = false;
      validation.reasons.push('Длинный фитиль - отказ цены');
      validation.isValid = false;
    }

    // 4. Проверка RSI дивергенции
    if (rsiData.length >= 3 && volumeData.length >= 3) {
      const prices = volumeData.slice(-3);
      if (this.checkRSIDivergence(prices, rsiData.slice(-3))) {
        validation.divergenceCheck = false;
        validation.reasons.push('RSI дивергенция');
        validation.isValid = false;
      }
    }

    return validation;
  }

  /**
   * Проверяет наличие volume spike
   * @param currentVolume - Текущий объём
   * @param avgVolume - Средний объём
   * @returns true если есть volume spike
   */
  checkVolumeSpike(currentVolume: number, avgVolume: number): boolean {
    return currentVolume >= avgVolume * this.volumeSpikeMultiplier;
  }

  /**
   * Проверяет наличие RSI дивергенции
   * @param prices - Последние 3 цены
   * @param rsiValues - Последние 3 значения RSI
   * @returns true если есть дивергенция
   */
  checkRSIDivergence(prices: number[], rsiValues: number[]): boolean {
    if (prices.length < 3 || rsiValues.length < 3) {
      return false;
    }

    // Бычья дивергенция: цена растёт, RSI падает
    if (prices[2] > prices[0] && rsiValues[2] < rsiValues[0]) {
      return true;
    }

    // Медвежья дивергенция: цена падает, RSI растёт
    if (prices[2] < prices[0] && rsiValues[2] > rsiValues[0]) {
      return true;
    }

    return false;
  }

  /**
   * Рассчитывает средний объём
   */
  private calculateAverageVolume(volumeData: number[]): number {
    const recentVolumes = volumeData.slice(-20); // Последние 20 свечей
    if (recentVolumes.length === 0) return 0;

    const sum = recentVolumes.reduce((acc, vol) => acc + vol, 0);
    return sum / recentVolumes.length;
  }

  /**
   * Рассчитывает размер фитиля относительно размера свечи
   */
  private calculateWickRatio(candle: Candlestick, isHighBreakout: boolean): number {
    const candleRange = candle.high - candle.low;
    if (candleRange === 0) return 0;

    if (isHighBreakout) {
      // Для пробоя вверх: размер верхнего фитиля
      return (candle.high - Math.max(candle.open, candle.close)) / candleRange;
    } else {
      // Для пробоя вниз: размер нижнего фитиля
      return (Math.min(candle.open, candle.close) - candle.low) / candleRange;
    }
  }
}
