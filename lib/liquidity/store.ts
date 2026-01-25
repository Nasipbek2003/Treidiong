/**
 * LiquidityStore - Хранилище данных Liquidity Engine (ОПЦИОНАЛЬНО)
 * 
 * Управляет состоянием и историей:
 * - Liquidity pools
 * - Liquidity sweeps
 * - Structure changes
 * - Trading signals
 * 
 * Может быть заменено на внешнюю БД или state management
 */

import {
  LiquidityPool,
  LiquiditySweep,
  StructureChange,
  TradingSignal,
  Candlestick,
} from './types';

export interface StoreState {
  pools: LiquidityPool[];
  sweeps: LiquiditySweep[];
  structures: StructureChange[];
  signals: TradingSignal[];
  candles: Candlestick[];
  lastUpdate: number;
}

export class LiquidityStore {
  private state: StoreState;
  private listeners: Set<(state: StoreState) => void>;

  constructor() {
    this.state = {
      pools: [],
      sweeps: [],
      structures: [],
      signals: [],
      candles: [],
      lastUpdate: Date.now(),
    };
    this.listeners = new Set();
  }

  /**
   * Получить текущее состояние
   */
  getState(): Readonly<StoreState> {
    return { ...this.state };
  }

  /**
   * Добавить liquidity pool
   */
  addPool(pool: LiquidityPool): void {
    this.state.pools.push(pool);
    this.state.lastUpdate = Date.now();
    this.notifyListeners();
  }

  /**
   * Обновить статус pool (active → swept)
   */
  updatePoolStatus(poolId: string, status: 'active' | 'swept'): void {
    const pool = this.state.pools.find(p => p.id === poolId);
    if (pool) {
      pool.status = status;
      this.state.lastUpdate = Date.now();
      this.notifyListeners();
    }
  }

  /**
   * Добавить liquidity sweep
   */
  addSweep(sweep: LiquiditySweep): void {
    this.state.sweeps.push(sweep);
    
    // Автоматически помечаем pool как swept
    this.updatePoolStatus(sweep.poolId, 'swept');
    
    this.state.lastUpdate = Date.now();
    this.notifyListeners();
  }

  /**
   * Добавить structure change
   */
  addStructureChange(structure: StructureChange): void {
    this.state.structures.push(structure);
    this.state.lastUpdate = Date.now();
    this.notifyListeners();
  }

  /**
   * Добавить trading signal
   */
  addSignal(signal: TradingSignal): void {
    this.state.signals.push(signal);
    this.state.lastUpdate = Date.now();
    this.notifyListeners();
  }

  /**
   * Обновить свечи
   */
  updateCandles(candles: Candlestick[]): void {
    this.state.candles = candles;
    this.state.lastUpdate = Date.now();
    this.notifyListeners();
  }

  /**
   * Получить активные pools
   */
  getActivePools(): LiquidityPool[] {
    return this.state.pools.filter(p => p.status === 'active');
  }

  /**
   * Получить swept pools
   */
  getSweptPools(): LiquidityPool[] {
    return this.state.pools.filter(p => p.status === 'swept');
  }

  /**
   * Получить sweeps за период
   */
  getSweepsInRange(startTime: number, endTime: number): LiquiditySweep[] {
    return this.state.sweeps.filter(
      s => s.sweepTimestamp >= startTime && s.sweepTimestamp <= endTime
    );
  }

  /**
   * Получить structure changes за период
   */
  getStructuresInRange(startTime: number, endTime: number): StructureChange[] {
    return this.state.structures.filter(
      s => s.timestamp >= startTime && s.timestamp <= endTime
    );
  }

  /**
   * Получить signals за период
   */
  getSignalsInRange(startTime: number, endTime: number): TradingSignal[] {
    return this.state.signals.filter(
      s => s.timestamp >= startTime && s.timestamp <= endTime
    );
  }

  /**
   * Получить последние N signals
   */
  getRecentSignals(count: number): TradingSignal[] {
    return this.state.signals
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, count);
  }

  /**
   * Очистить старые данные (старше N дней)
   */
  cleanupOldData(daysToKeep: number): void {
    const cutoffTime = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;

    this.state.pools = this.state.pools.filter(p => p.timestamp >= cutoffTime);
    this.state.sweeps = this.state.sweeps.filter(s => s.sweepTimestamp >= cutoffTime);
    this.state.structures = this.state.structures.filter(s => s.timestamp >= cutoffTime);
    this.state.signals = this.state.signals.filter(s => s.timestamp >= cutoffTime);
    this.state.candles = this.state.candles.filter(c => c.timestamp >= cutoffTime);

    this.state.lastUpdate = Date.now();
    this.notifyListeners();
  }

  /**
   * Сбросить всё состояние
   */
  reset(): void {
    this.state = {
      pools: [],
      sweeps: [],
      structures: [],
      signals: [],
      candles: [],
      lastUpdate: Date.now(),
    };
    this.notifyListeners();
  }

  /**
   * Подписаться на изменения
   */
  subscribe(listener: (state: StoreState) => void): () => void {
    this.listeners.add(listener);
    
    // Возвращаем функцию отписки
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Уведомить всех подписчиков
   */
  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach(listener => listener(state));
  }

  /**
   * Экспорт данных в JSON
   */
  exportToJSON(): string {
    return JSON.stringify(this.state, null, 2);
  }

  /**
   * Импорт данных из JSON
   */
  importFromJSON(json: string): void {
    try {
      const imported = JSON.parse(json);
      this.state = {
        ...this.state,
        ...imported,
        lastUpdate: Date.now(),
      };
      this.notifyListeners();
    } catch (error) {
      throw new Error('Invalid JSON format');
    }
  }

  /**
   * Получить статистику
   */
  getStatistics(): {
    totalPools: number;
    activePools: number;
    sweptPools: number;
    totalSweeps: number;
    totalStructures: number;
    totalSignals: number;
    avgSignalScore: number;
  } {
    const signals = this.state.signals;
    const avgScore = signals.length > 0
      ? signals.reduce((sum, s) => sum + s.score.totalScore, 0) / signals.length
      : 0;

    return {
      totalPools: this.state.pools.length,
      activePools: this.getActivePools().length,
      sweptPools: this.getSweptPools().length,
      totalSweeps: this.state.sweeps.length,
      totalStructures: this.state.structures.length,
      totalSignals: signals.length,
      avgSignalScore: avgScore,
    };
  }
}
