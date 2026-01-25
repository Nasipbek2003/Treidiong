/**
 * Visualization - Генерация данных для визуализации
 * 
 * Подготавливает данные для отображения на графиках:
 * - Liquidity pools (зоны)
 * - Liquidity sweeps (стрелки)
 * - Structure changes (маркеры CHOCH/BOS)
 * - Trading signals (точки входа)
 */

import {
  LiquidityPool,
  LiquiditySweep,
  StructureChange,
  TradingSignal,
  Candlestick,
} from './types';

/**
 * Данные для отрисовки liquidity pool на графике
 */
export interface PoolVisualization {
  id: string;
  type: string;
  price: number;
  startTime: number;
  endTime: number;
  status: 'active' | 'swept';
  strength: number;
  color: string;
  label: string;
}

/**
 * Данные для отрисовки liquidity sweep
 */
export interface SweepVisualization {
  id: string;
  poolId: string;
  timestamp: number;
  price: number;
  direction: 'up' | 'down';
  wickSize: number;
  rejectionStrength: number;
  color: string;
  label: string;
}

/**
 * Данные для отрисовки structure change
 */
export interface StructureVisualization {
  id: string;
  type: 'CHOCH' | 'BOS';
  timestamp: number;
  price: number;
  direction: 'up' | 'down';
  significance: number;
  color: string;
  label: string;
  icon: string;
}

/**
 * Данные для отрисовки trading signal
 */
export interface SignalVisualization {
  id: string;
  timestamp: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  direction: 'BUY' | 'SELL';
  score: number;
  color: string;
  label: string;
}

/**
 * Полный набор данных для визуализации
 */
export interface VisualizationData {
  pools: PoolVisualization[];
  sweeps: SweepVisualization[];
  structures: StructureVisualization[];
  signals: SignalVisualization[];
}

export class Visualization {
  /**
   * Генерирует данные для визуализации liquidity pools
   */
  generatePoolVisualizations(
    pools: LiquidityPool[],
    candles: Candlestick[]
  ): PoolVisualization[] {
    return pools.map(pool => {
      const startCandle = candles[pool.candleIndices[0]];
      const endCandle = candles[candles.length - 1];

      return {
        id: pool.id,
        type: pool.type,
        price: pool.price,
        startTime: startCandle?.timestamp || pool.timestamp,
        endTime: endCandle?.timestamp || Date.now(),
        status: pool.status,
        strength: pool.strength,
        color: this.getPoolColor(pool),
        label: this.getPoolLabel(pool),
      };
    });
  }

  /**
   * Генерирует данные для визуализации liquidity sweeps
   */
  generateSweepVisualizations(sweeps: LiquiditySweep[]): SweepVisualization[] {
    return sweeps.map(sweep => ({
      id: sweep.id,
      poolId: sweep.poolId,
      timestamp: sweep.sweepTimestamp,
      price: sweep.sweepPrice,
      direction: sweep.direction,
      wickSize: sweep.wickSize,
      rejectionStrength: sweep.rejectionStrength,
      color: this.getSweepColor(sweep),
      label: this.getSweepLabel(sweep),
    }));
  }

  /**
   * Генерирует данные для визуализации structure changes
   */
  generateStructureVisualizations(
    structures: StructureChange[]
  ): StructureVisualization[] {
    return structures.map(structure => ({
      id: structure.id,
      type: structure.type,
      timestamp: structure.timestamp,
      price: structure.price,
      direction: structure.direction,
      significance: structure.significance,
      color: this.getStructureColor(structure),
      label: this.getStructureLabel(structure),
      icon: structure.type === 'CHOCH' ? '🔄' : '⚡',
    }));
  }

  /**
   * Генерирует данные для визуализации trading signals
   */
  generateSignalVisualizations(signals: TradingSignal[]): SignalVisualization[] {
    return signals.map(signal => ({
      id: signal.id,
      timestamp: signal.timestamp,
      entryPrice: signal.entryPrice,
      stopLoss: signal.stopLoss,
      takeProfit: signal.takeProfit,
      direction: signal.direction,
      score: signal.score.totalScore,
      color: this.getSignalColor(signal),
      label: this.getSignalLabel(signal),
    }));
  }

  /**
   * Генерирует полный набор данных для визуализации
   */
  generateVisualizationData(
    pools: LiquidityPool[],
    sweeps: LiquiditySweep[],
    structures: StructureChange[],
    signals: TradingSignal[],
    candles: Candlestick[]
  ): VisualizationData {
    return {
      pools: this.generatePoolVisualizations(pools, candles),
      sweeps: this.generateSweepVisualizations(sweeps),
      structures: this.generateStructureVisualizations(structures),
      signals: this.generateSignalVisualizations(signals),
    };
  }

  /**
   * Определяет цвет для liquidity pool
   */
  private getPoolColor(pool: LiquidityPool): string {
    const highTypes = ['equal_highs', 'pdh', 'asian_high', 'range_high', 'trendline_high'];
    const isHigh = highTypes.includes(pool.type);

    if (pool.status === 'swept') {
      return '#666666'; // Серый для swept pools
    }

    return isHigh ? '#ef4444' : '#22c55e'; // Красный для resistance, зелёный для support
  }

  /**
   * Генерирует label для liquidity pool
   */
  private getPoolLabel(pool: LiquidityPool): string {
    const typeLabels: Record<string, string> = {
      equal_highs: 'EQH',
      equal_lows: 'EQL',
      pdh: 'PDH',
      pdl: 'PDL',
      asian_high: 'Asian High',
      asian_low: 'Asian Low',
      range_high: 'Range High',
      range_low: 'Range Low',
      trendline_high: 'Trendline High',
      trendline_low: 'Trendline Low',
    };

    const label = typeLabels[pool.type] || pool.type;
    const strengthIndicator = '★'.repeat(Math.min(pool.strength, 5));

    return `${label} ${strengthIndicator}`;
  }

  /**
   * Определяет цвет для liquidity sweep
   */
  private getSweepColor(sweep: LiquiditySweep): string {
    // Цвет зависит от силы отката
    if (sweep.rejectionStrength > 0.7) {
      return '#f59e0b'; // Оранжевый для сильного отката
    } else if (sweep.rejectionStrength > 0.4) {
      return '#eab308'; // Жёлтый для среднего отката
    } else {
      return '#84cc16'; // Зелёный для слабого отката
    }
  }

  /**
   * Генерирует label для liquidity sweep
   */
  private getSweepLabel(sweep: LiquiditySweep): string {
    const direction = sweep.direction === 'up' ? '↑' : '↓';
    const wickPercent = (sweep.wickSize * 100).toFixed(0);
    const rejectionPercent = (sweep.rejectionStrength * 100).toFixed(0);

    return `${direction} Sweep (Wick: ${wickPercent}%, Rejection: ${rejectionPercent}%)`;
  }

  /**
   * Определяет цвет для structure change
   */
  private getStructureColor(structure: StructureChange): string {
    if (structure.type === 'CHOCH') {
      return structure.direction === 'up' ? '#10b981' : '#ef4444';
    } else {
      return structure.direction === 'up' ? '#06b6d4' : '#f97316';
    }
  }

  /**
   * Генерирует label для structure change
   */
  private getStructureLabel(structure: StructureChange): string {
    const direction = structure.direction === 'up' ? 'Bullish' : 'Bearish';
    const significance = (structure.significance * 100).toFixed(0);

    return `${structure.type} ${direction} (${significance}%)`;
  }

  /**
   * Определяет цвет для trading signal
   */
  private getSignalColor(signal: TradingSignal): string {
    return signal.direction === 'BUY' ? '#22c55e' : '#ef4444';
  }

  /**
   * Генерирует label для trading signal
   */
  private getSignalLabel(signal: TradingSignal): string {
    const score = signal.score.totalScore.toFixed(1);
    return `${signal.direction} Signal (Score: ${score}/100)`;
  }

  /**
   * Генерирует SVG path для стрелки sweep
   */
  generateSweepArrow(
    sweep: SweepVisualization,
    chartWidth: number,
    chartHeight: number
  ): string {
    const arrowSize = 10;
    const direction = sweep.direction === 'up' ? -1 : 1;

    // Простая стрелка вверх/вниз
    return `M 0,0 L ${arrowSize / 2},${arrowSize * direction} L ${-arrowSize / 2},${arrowSize * direction} Z`;
  }

  /**
   * Генерирует координаты для отрисовки зоны pool
   */
  generatePoolZone(
    pool: PoolVisualization,
    chartWidth: number,
    chartHeight: number,
    priceScale: (price: number) => number,
    timeScale: (time: number) => number
  ): { x1: number; y: number; x2: number; height: number } {
    const y = priceScale(pool.price);
    const x1 = timeScale(pool.startTime);
    const x2 = timeScale(pool.endTime);
    const height = 2; // Толщина линии

    return { x1, y, x2, height };
  }
}
