/**
 * TriangleDetector - Детекция паттерна "Треугольник"
 * 
 * Распознаёт треугольники на графике и определяет правильные точки входа
 * согласно правилам из документа "Троигольник"
 */

import { Candlestick } from './types';

export interface TriangleLine {
  points: { index: number; price: number }[];
  slope: number;
  intercept: number;
}

export interface Triangle {
  id: string;
  upperLine: TriangleLine;
  lowerLine: TriangleLine;
  startIndex: number;
  endIndex: number;
  height: number;
  isValid: boolean;
  isConverging: boolean;
  compressionRatio: number;
}

export interface TriangleBreakout {
  triangleId: string;
  direction: 'up' | 'down';
  breakoutIndex: number;
  breakoutPrice: number;
  isClosed: boolean;
  isBodyBreakout: boolean;
}

export interface TriangleRetest {
  triangleId: string;
  breakoutDirection: 'up' | 'down';
  retestIndex: number;
  retestPrice: number;
  lineHolds: boolean;
  weakCandles: boolean;
}

export interface FalseBreakout {
  triangleId: string;
  fakeDirection: 'up' | 'down';
  fakeBreakoutIndex: number;
  returnIndex: number;
  closedInside: boolean;
}

export type TriangleSignalType = 'breakout-retest' | 'false-breakout';

export interface TriangleSignal {
  id: string;
  type: TriangleSignalType;
  triangle: Triangle;
  direction: 'BUY' | 'SELL';
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  reasoning: string;
  confidence: number;
}

function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class TriangleDetector {
  private minTouches: number = 2;
  private lookbackPeriod: number = 50;
  private convergenceThreshold: number = 0.7; // Линии должны сходиться

  /**
   * ШАГ 1: Построить треугольник
   * Условия:
   * - минимум 2 касания сверху
   * - минимум 2 касания снизу
   * - линии сходятся
   * - цена сжимается (свечи короче)
   */
  detectTriangles(candles: Candlestick[]): Triangle[] {
    if (candles.length < 20) {
      return [];
    }

    const triangles: Triangle[] = [];
    const windowSize = Math.min(this.lookbackPeriod, candles.length);

    // Ищем треугольники в скользящем окне
    for (let i = windowSize; i < candles.length; i++) {
      const window = candles.slice(i - windowSize, i);
      const triangle = this.findTriangleInWindow(window, i - windowSize);

      if (triangle && triangle.isValid) {
        triangles.push(triangle);
      }
    }

    return triangles;
  }

  /**
   * Поиск треугольника в окне свечей
   */
  private findTriangleInWindow(
    candles: Candlestick[],
    startOffset: number
  ): Triangle | null {
    // Находим swing highs и swing lows
    const swingHighs = this.findSwingHighs(candles);
    const swingLows = this.findSwingLows(candles);

    if (swingHighs.length < this.minTouches || swingLows.length < this.minTouches) {
      return null;
    }

    // Строим линии тренда
    const upperLine = this.buildTrendline(swingHighs);
    const lowerLine = this.buildTrendline(swingLows);

    if (!upperLine || !lowerLine) {
      return null;
    }

    // Проверяем сходимость линий
    const isConverging = this.checkConvergence(upperLine, lowerLine, candles.length);

    if (!isConverging) {
      return null;
    }

    // Проверяем сжатие цены (свечи становятся короче)
    const compressionRatio = this.calculateCompression(candles);

    if (compressionRatio < this.convergenceThreshold) {
      return null;
    }

    // Рассчитываем высоту треугольника
    const startIndex = Math.min(
      swingHighs[0].index,
      swingLows[0].index
    );
    const endIndex = candles.length - 1;

    const startUpperPrice = upperLine.slope * startIndex + upperLine.intercept;
    const startLowerPrice = lowerLine.slope * startIndex + lowerLine.intercept;
    const height = startUpperPrice - startLowerPrice;

    return {
      id: uuidv4(),
      upperLine,
      lowerLine,
      startIndex: startOffset + startIndex,
      endIndex: startOffset + endIndex,
      height,
      isValid: true,
      isConverging,
      compressionRatio,
    };
  }

  /**
   * Находит swing highs (локальные максимумы)
   */
  private findSwingHighs(candles: Candlestick[]): { index: number; price: number }[] {
    const swingHighs: { index: number; price: number }[] = [];
    const lookback = 2;

    for (let i = lookback; i < candles.length - lookback; i++) {
      let isSwingHigh = true;

      for (let j = 1; j <= lookback; j++) {
        if (
          candles[i].high <= candles[i - j].high ||
          candles[i].high <= candles[i + j].high
        ) {
          isSwingHigh = false;
          break;
        }
      }

      if (isSwingHigh) {
        swingHighs.push({ index: i, price: candles[i].high });
      }
    }

    return swingHighs;
  }

  /**
   * Находит swing lows (локальные минимумы)
   */
  private findSwingLows(candles: Candlestick[]): { index: number; price: number }[] {
    const swingLows: { index: number; price: number }[] = [];
    const lookback = 2;

    for (let i = lookback; i < candles.length - lookback; i++) {
      let isSwingLow = true;

      for (let j = 1; j <= lookback; j++) {
        if (
          candles[i].low >= candles[i - j].low ||
          candles[i].low >= candles[i + j].low
        ) {
          isSwingLow = false;
          break;
        }
      }

      if (isSwingLow) {
        swingLows.push({ index: i, price: candles[i].low });
      }
    }

    return swingLows;
  }

  /**
   * Строит линию тренда через точки
   */
  private buildTrendline(
    points: { index: number; price: number }[]
  ): TriangleLine | null {
    if (points.length < 2) {
      return null;
    }

    // Используем линейную регрессию
    const n = points.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    for (const point of points) {
      sumX += point.index;
      sumY += point.price;
      sumXY += point.index * point.price;
      sumX2 += point.index * point.index;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return {
      points,
      slope,
      intercept,
    };
  }

  /**
   * Проверяет сходимость линий
   */
  private checkConvergence(
    upperLine: TriangleLine,
    lowerLine: TriangleLine,
    length: number
  ): boolean {
    // Рассчитываем расстояние между линиями в начале и конце
    const startIndex = 0;
    const endIndex = length - 1;

    const startUpper = upperLine.slope * startIndex + upperLine.intercept;
    const startLower = lowerLine.slope * startIndex + lowerLine.intercept;
    const startDistance = startUpper - startLower;

    const endUpper = upperLine.slope * endIndex + upperLine.intercept;
    const endLower = lowerLine.slope * endIndex + lowerLine.intercept;
    const endDistance = endUpper - endLower;

    // Линии должны сходиться (расстояние уменьшается)
    return endDistance < startDistance * this.convergenceThreshold;
  }

  /**
   * Рассчитывает коэффициент сжатия цены
   */
  private calculateCompression(candles: Candlestick[]): number {
    if (candles.length < 10) {
      return 0;
    }

    // Сравниваем средний размер свечей в начале и конце
    const firstHalf = candles.slice(0, Math.floor(candles.length / 2));
    const secondHalf = candles.slice(Math.floor(candles.length / 2));

    const avgFirstHalf =
      firstHalf.reduce((sum, c) => sum + (c.high - c.low), 0) / firstHalf.length;
    const avgSecondHalf =
      secondHalf.reduce((sum, c) => sum + (c.high - c.low), 0) / secondHalf.length;

    if (avgFirstHalf === 0) {
      return 0;
    }

    // Коэффициент сжатия (чем меньше, тем сильнее сжатие)
    return avgSecondHalf / avgFirstHalf;
  }

  /**
   * ШАГ 3: Определить пробой
   * ✅ Пробой — это:
   * - свеча ЗАКРЫЛАСЬ за границей
   * - тело свечи за линией
   * - следующая свеча не возвращается сразу
   */
  detectBreakout(
    candles: Candlestick[],
    triangle: Triangle,
    currentIndex: number
  ): TriangleBreakout | null {
    if (currentIndex < triangle.startIndex || currentIndex > triangle.endIndex + 10) {
      return null;
    }

    const candle = candles[currentIndex];
    const upperPrice = triangle.upperLine.slope * currentIndex + triangle.upperLine.intercept;
    const lowerPrice = triangle.lowerLine.slope * currentIndex + triangle.lowerLine.intercept;

    // Проверка пробоя вверх
    if (candle.close > upperPrice) {
      const isBodyBreakout = candle.open > upperPrice || candle.close > upperPrice;

      // Проверяем, что следующая свеча не вернулась сразу
      let nextCandleHolds = true;
      if (currentIndex + 1 < candles.length) {
        const nextCandle = candles[currentIndex + 1];
        nextCandleHolds = nextCandle.close > upperPrice * 0.995; // 0.5% толерантность
      }

      if (isBodyBreakout && nextCandleHolds) {
        return {
          triangleId: triangle.id,
          direction: 'up',
          breakoutIndex: currentIndex,
          breakoutPrice: candle.close,
          isClosed: true,
          isBodyBreakout,
        };
      }
    }

    // Проверка пробоя вниз
    if (candle.close < lowerPrice) {
      const isBodyBreakout = candle.open < lowerPrice || candle.close < lowerPrice;

      // Проверяем, что следующая свеча не вернулась сразу
      let nextCandleHolds = true;
      if (currentIndex + 1 < candles.length) {
        const nextCandle = candles[currentIndex + 1];
        nextCandleHolds = nextCandle.close < lowerPrice * 1.005; // 0.5% толерантность
      }

      if (isBodyBreakout && nextCandleHolds) {
        return {
          triangleId: triangle.id,
          direction: 'down',
          breakoutIndex: currentIndex,
          breakoutPrice: candle.close,
          isClosed: true,
          isBodyBreakout,
        };
      }
    }

    return null;
  }

  /**
   * ШАГ 4А: ПРОБОЙ + РЕТЕСТ (самый безопасный)
   * Алгоритм:
   * 1. Закрытие свечи за границей
   * 2. Цена возвращается к линии
   * 3. Линия держит (малые свечи, откат слабый)
   * 4. Вход по направлению пробоя
   */
  detectRetest(
    candles: Candlestick[],
    triangle: Triangle,
    breakout: TriangleBreakout,
    currentIndex: number
  ): TriangleRetest | null {
    if (currentIndex <= breakout.breakoutIndex || currentIndex > breakout.breakoutIndex + 10) {
      return null;
    }

    const candle = candles[currentIndex];
    const linePrice =
      breakout.direction === 'up'
        ? triangle.upperLine.slope * currentIndex + triangle.upperLine.intercept
        : triangle.lowerLine.slope * currentIndex + triangle.lowerLine.intercept;

    // Проверяем возврат к линии (в пределах 1%)
    const distanceToLine = Math.abs(candle.close - linePrice) / linePrice;

    if (distanceToLine > 0.01) {
      return null;
    }

    // Проверяем, что линия держит
    const lineHolds =
      breakout.direction === 'up'
        ? candle.low > linePrice * 0.995
        : candle.high < linePrice * 1.005;

    // Проверяем слабость отката (малые свечи)
    const candleSize = candle.high - candle.low;
    const recentCandles = candles.slice(
      Math.max(0, currentIndex - 5),
      currentIndex
    );
    const avgCandleSize =
      recentCandles.reduce((sum, c) => sum + (c.high - c.low), 0) / recentCandles.length;

    const weakCandles = candleSize < avgCandleSize * 0.7;

    if (lineHolds && weakCandles) {
      return {
        triangleId: triangle.id,
        breakoutDirection: breakout.direction,
        retestIndex: currentIndex,
        retestPrice: candle.close,
        lineHolds,
        weakCandles,
      };
    }

    return null;
  }

  /**
   * ШАГ 4Б: ЛОЖНЫЙ ПРОБОЙ
   * Алгоритм:
   * 1. Цена вылетает за границу
   * 2. Быстро возвращается внутрь
   * 3. Свеча закрывается ОБРАТНО в треугольнике
   * 4. Вход в противоположную сторону
   */
  detectFalseBreakout(
    candles: Candlestick[],
    triangle: Triangle,
    currentIndex: number
  ): FalseBreakout | null {
    if (currentIndex < triangle.startIndex || currentIndex > triangle.endIndex + 5) {
      return null;
    }

    const candle = candles[currentIndex];
    const upperPrice = triangle.upperLine.slope * currentIndex + triangle.upperLine.intercept;
    const lowerPrice = triangle.lowerLine.slope * currentIndex + triangle.lowerLine.intercept;

    // Ложный пробой вверх (цена вылетела, но закрылась внутри)
    if (candle.high > upperPrice && candle.close < upperPrice) {
      return {
        triangleId: triangle.id,
        fakeDirection: 'up',
        fakeBreakoutIndex: currentIndex,
        returnIndex: currentIndex,
        closedInside: true,
      };
    }

    // Ложный пробой вниз (цена вылетела, но закрылась внутри)
    if (candle.low < lowerPrice && candle.close > lowerPrice) {
      return {
        triangleId: triangle.id,
        fakeDirection: 'down',
        fakeBreakoutIndex: currentIndex,
        returnIndex: currentIndex,
        closedInside: true,
      };
    }

    return null;
  }

  /**
   * Генерация торгового сигнала на основе треугольника
   */
  generateSignal(
    candles: Candlestick[],
    triangle: Triangle,
    signalType: TriangleSignalType,
    breakout?: TriangleBreakout,
    retest?: TriangleRetest,
    falseBreakout?: FalseBreakout
  ): TriangleSignal | null {
    let direction: 'BUY' | 'SELL';
    let entryPrice: number;
    let stopLoss: number;
    let takeProfit: number;
    let reasoning: string;
    let confidence: number;

    if (signalType === 'breakout-retest' && breakout && retest) {
      // ВАРИАНТ 1: ПРОБОЙ + РЕТЕСТ
      direction = breakout.direction === 'up' ? 'BUY' : 'SELL';
      entryPrice = retest.retestPrice;

      if (direction === 'BUY') {
        // Стоп за линию треугольника
        const linePrice =
          triangle.upperLine.slope * retest.retestIndex +
          triangle.upperLine.intercept;
        stopLoss = linePrice * 0.995;

        // Тейк = высота треугольника
        takeProfit = entryPrice + triangle.height;
      } else {
        // Стоп за линию треугольника
        const linePrice =
          triangle.lowerLine.slope * retest.retestIndex +
          triangle.lowerLine.intercept;
        stopLoss = linePrice * 1.005;

        // Тейк = высота треугольника
        takeProfit = entryPrice - triangle.height;
      }

      reasoning = `Пробой треугольника ${direction === 'BUY' ? 'вверх' : 'вниз'} с ретестом. Линия держит, откат слабый. Вход по направлению пробоя.`;
      confidence = 0.85;
    } else if (signalType === 'false-breakout' && falseBreakout) {
      // ВАРИАНТ 2: ЛОЖНЫЙ ПРОБОЙ
      direction = falseBreakout.fakeDirection === 'up' ? 'SELL' : 'BUY';
      const candle = candles[falseBreakout.returnIndex];
      entryPrice = candle.close;

      if (direction === 'BUY') {
        // Стоп за экстремум ложного пробоя
        stopLoss = candle.low * 0.995;

        // Тейк = противоположная граница треугольника
        const targetLinePrice =
          triangle.upperLine.slope * falseBreakout.returnIndex +
          triangle.upperLine.intercept;
        takeProfit = targetLinePrice;
      } else {
        // Стоп за экстремум ложного пробоя
        stopLoss = candle.high * 1.005;

        // Тейк = противоположная граница треугольника
        const targetLinePrice =
          triangle.lowerLine.slope * falseBreakout.returnIndex +
          triangle.lowerLine.intercept;
        takeProfit = targetLinePrice;
      }

      reasoning = `Ложный пробой треугольника ${falseBreakout.fakeDirection === 'up' ? 'вверх' : 'вниз'}. Цена вернулась внутрь. Вход в противоположную сторону.`;
      confidence = 0.75;
    } else {
      return null;
    }

    return {
      id: uuidv4(),
      type: signalType,
      triangle,
      direction,
      entryPrice,
      stopLoss,
      takeProfit,
      reasoning,
      confidence,
    };
  }

  /**
   * ШАГ 5: Фильтр перед входом
   * 3 вопроса:
   * 1. Есть ли закрытие свечи?
   * 2. Есть ли место для движения?
   * 3. Где стопы толпы?
   */
  validateSignal(
    candles: Candlestick[],
    signal: TriangleSignal,
    currentIndex: number
  ): { isValid: boolean; reasons: string[] } {
    const reasons: string[] = [];

    // 1. Есть ли закрытие свечи?
    const candle = candles[currentIndex];
    if (!candle) {
      reasons.push('Нет закрытой свечи');
      return { isValid: false, reasons };
    }

    // 2. Есть ли место для движения?
    const riskReward = Math.abs(signal.takeProfit - signal.entryPrice) / 
                       Math.abs(signal.entryPrice - signal.stopLoss);

    if (riskReward < 1.5) {
      reasons.push(`Недостаточно места для движения (R:R = ${riskReward.toFixed(2)})`);
    }

    // 3. Где стопы толпы? (проверяем, что наш стоп не в очевидном месте)
    const stopDistance = Math.abs(signal.entryPrice - signal.stopLoss) / signal.entryPrice;

    if (stopDistance < 0.005) {
      reasons.push('Стоп слишком близко (< 0.5%)');
    }

    if (stopDistance > 0.03) {
      reasons.push('Стоп слишком далеко (> 3%)');
    }

    return {
      isValid: reasons.length === 0,
      reasons,
    };
  }
}
