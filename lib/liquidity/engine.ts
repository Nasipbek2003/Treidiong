/**
 * LiquidityEngine - Главный координатор всех компонентов
 * 
 * Объединяет все модули для полного анализа ликвидности
 */

import { LiquidityPoolDetector } from './pool-detector';
import { SweepDetector } from './sweep-detector';
import { BreakoutValidator } from './breakout-validator';
import { StructureAnalyzer } from './structure-analyzer';
import { SignalScorer } from './signal-scorer';
import { LiquidityStore } from './store';
import {
  Candlestick,
  LiquidityConfig,
  TradingSignal,
  SignalDirection,
  LiquidityPool,
  LiquiditySweep,
  StructureChange,
} from './types';

function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface AnalysisResult {
  pools: LiquidityPool[];
  sweeps: LiquiditySweep[];
  structures: StructureChange[];
  signal: TradingSignal | null;
  hasValidSetup: boolean;
  blockingReasons: string[];
}

export class LiquidityEngine {
  private poolDetector: LiquidityPoolDetector;
  private sweepDetector: SweepDetector;
  private breakoutValidator: BreakoutValidator;
  private structureAnalyzer: StructureAnalyzer;
  private signalScorer: SignalScorer;
  private store: LiquidityStore;
  private config: LiquidityConfig;

  constructor(config: LiquidityConfig) {
    this.config = config;
    this.poolDetector = new LiquidityPoolDetector(config);
    this.sweepDetector = new SweepDetector();
    this.breakoutValidator = new BreakoutValidator(config.volumeSpikeMultiplier);
    this.structureAnalyzer = new StructureAnalyzer(config.swingLookback);
    this.signalScorer = new SignalScorer(config.scoreWeights);
    this.store = new LiquidityStore();
  }

  /**
   * Полный анализ свечных данных
   */
  async analyze(
    symbol: string,
    candles: Candlestick[],
    rsiData?: number[]
  ): Promise<AnalysisResult> {
    if (!candles || candles.length < 50) {
      return {
        pools: [],
        sweeps: [],
        structures: [],
        signal: null,
        hasValidSetup: false,
        blockingReasons: ['Недостаточно данных для анализа'],
      };
    }

    // 1. Обновляем свечи в store
    this.store.updateCandles(candles);

    // 2. Детекция liquidity pools
    const pools = this.poolDetector.getAllPools(candles);
    pools.forEach(pool => this.store.addPool(pool));

    // 3. Детекция sweeps
    const activePools = this.store.getActivePools();
    const latestCandle = candles[candles.length - 1];
    const sweep = this.sweepDetector.detectSweep(latestCandle, activePools);

    if (sweep) {
      sweep.candleIndex = candles.length - 1;
      this.store.addSweep(sweep);
    }

    // 4. Анализ структуры
    const structures = this.structureAnalyzer.analyzeStructure(candles);
    structures.forEach(s => this.store.addStructureChange(s));

    // 5. Генерация сигнала
    const result = this.generateSignal(symbol, candles, rsiData);

    return {
      pools: this.store.getState().pools,
      sweeps: this.store.getState().sweeps,
      structures: this.store.getState().structures,
      signal: result.signal,
      hasValidSetup: result.hasValidSetup,
      blockingReasons: result.blockingReasons,
    };
  }

  /**
   * Генерация торгового сигнала
   */
  private generateSignal(
    symbol: string,
    candles: Candlestick[],
    rsiData?: number[]
  ): { signal: TradingSignal | null; hasValidSetup: boolean; blockingReasons: string[] } {
    const blockingReasons: string[] = [];
    const latestCandle = candles[candles.length - 1];

    // Проверка 0: Фильтр по торговой сессии
    const now = new Date();
    const utcHour = now.getUTCHours();
    let session: 'ASIAN' | 'LONDON' | 'NEW_YORK' | 'OVERLAP' = 'ASIAN';
    let minScoreForSession = 50;
    
    if (utcHour >= 13 && utcHour < 16) {
      session = 'OVERLAP';
      minScoreForSession = 45; // Ниже порог
    } else if (utcHour >= 7 && utcHour < 16) {
      session = 'LONDON';
      minScoreForSession = 50;
    } else if (utcHour >= 13 && utcHour < 22) {
      session = 'NEW_YORK';
      minScoreForSession = 50;
    } else {
      session = 'ASIAN';
      minScoreForSession = 65; // Выше порог для азиатской сессии
    }

    // Получаем последние события
    const recentSweeps = this.store.getState().sweeps.slice(-5);
    const recentStructures = this.store.getState().structures.slice(-5);

    // Проверка 1: Есть ли недавний sweep?
    const latestSweep = recentSweeps[recentSweeps.length - 1];
    if (!latestSweep) {
      blockingReasons.push('Нет liquidity sweep');
      return { signal: null, hasValidSetup: false, blockingReasons };
    }

    // Проверка 2: Есть ли структурное подтверждение?
    const latestStructure = recentStructures[recentStructures.length - 1];
    if (!latestStructure) {
      blockingReasons.push('Нет структурного подтверждения (CHOCH/BOS)');
      return { signal: null, hasValidSetup: false, blockingReasons };
    }

    // Проверка 3: Sweep и structure в одном направлении?
    const sweepDirection = latestSweep.direction;
    const structureDirection = latestStructure.direction;

    // Для BUY: sweep down + structure up (или наоборот для SELL)
    const isValidDirection =
      (sweepDirection === 'down' && structureDirection === 'up') ||
      (sweepDirection === 'up' && structureDirection === 'down');

    if (!isValidDirection) {
      blockingReasons.push('Sweep и structure не подтверждают друг друга');
      return { signal: null, hasValidSetup: false, blockingReasons };
    }

    // Проверка 4: Валидация пробоя
    const volumeData = candles.map(c => c.volume);
    const pool = this.store.getState().pools.find(p => p.id === latestSweep.poolId);

    if (pool) {
      const validation = this.breakoutValidator.validateBreakout(
        latestCandle,
        pool,
        volumeData,
        rsiData || []
      );

      if (!validation.isValid) {
        blockingReasons.push(...validation.reasons);
        return { signal: null, hasValidSetup: false, blockingReasons };
      }
    }

    // Проверка 5: Расчёт score с треугольниками и сессией
    const htfPools = this.store.getState().pools.filter(p =>
      ['pdh', 'pdl'].includes(p.type)
    );

    // Проверяем треугольники
    let triangleData: { isValid: boolean; hasBreakout: boolean; hasRetest: boolean; compressionRatio: number } | null = null;
    const trianglePools = this.store.getState().pools.filter(p => 
      p.type === 'triangle_upper' || p.type === 'triangle_lower'
    );
    
    if (trianglePools.length >= 2) {
      // Есть треугольник
      triangleData = {
        isValid: true,
        hasBreakout: false,
        hasRetest: false,
        compressionRatio: 0.7 // Будет обновлено при интеграции triangle detector
      };
    }

    const score = this.signalScorer.calculateScore(
      latestSweep,
      latestStructure,
      latestCandle,
      volumeData,
      rsiData || [],
      htfPools,
      triangleData,
      session
    );

    // Проверка 6: Score с учетом сессии
    if (score.totalScore < minScoreForSession) {
      blockingReasons.push(
        `Score слишком низкий для ${session} сессии: ${score.totalScore.toFixed(1)}/${minScoreForSession} (требуется >= ${minScoreForSession})`
      );
      return { signal: null, hasValidSetup: false, blockingReasons };
    }

    // Генерируем сигнал
    const direction: SignalDirection = structureDirection === 'up' ? 'BUY' : 'SELL';
    const signal = this.createTradingSignal(
      symbol,
      direction,
      latestCandle,
      latestSweep,
      latestStructure,
      score
    );

    this.store.addSignal(signal);

    return { signal, hasValidSetup: true, blockingReasons: [] };
  }

  /**
   * Создание объекта торгового сигнала
   */
  private createTradingSignal(
    symbol: string,
    direction: SignalDirection,
    candle: Candlestick,
    sweep: LiquiditySweep,
    structure: StructureChange,
    score: any
  ): TradingSignal {
    const entryPrice = candle.close;

    // Рассчитываем ATR для адаптивных стопов
    const atr = this.calculateATR(this.store.getState().candles);
    
    // Расчёт stop loss и take profit с использованием ATR
    let stopLoss: number;
    let takeProfit: number;

    if (direction === 'BUY') {
      // Stop loss на основе ATR (1.5x ATR)
      stopLoss = entryPrice - (atr * 1.5);
      // Take profit с R:R 2:1
      takeProfit = entryPrice + (entryPrice - stopLoss) * 2;
    } else {
      // Stop loss на основе ATR (1.5x ATR)
      stopLoss = entryPrice + (atr * 1.5);
      // Take profit с R:R 2:1
      takeProfit = entryPrice - (stopLoss - entryPrice) * 2;
    }

    const reasoning = this.generateReasoning(sweep, structure, score);

    return {
      id: uuidv4(),
      symbol,
      direction,
      score,
      timestamp: Date.now(),
      sweepId: sweep.id,
      structureChangeId: structure.id,
      entryPrice,
      stopLoss,
      takeProfit,
      reasoning,
    };
  }

  /**
   * Рассчитывает ATR (Average True Range)
   */
  private calculateATR(candles: Candlestick[], period: number = 14): number {
    if (candles.length < period + 1) {
      // Fallback: используем средний размер свечей
      const avgRange = candles.slice(-20).reduce((sum, c) => sum + (c.high - c.low), 0) / Math.min(20, candles.length);
      return avgRange;
    }
    
    const trueRanges: number[] = [];
    
    for (let i = 1; i < candles.length; i++) {
      const high = candles[i].high;
      const low = candles[i].low;
      const prevClose = candles[i - 1].close;
      
      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      
      trueRanges.push(tr);
    }
    
    const recentTR = trueRanges.slice(-period);
    return recentTR.reduce((sum, tr) => sum + tr, 0) / period;
  }

  /**
   * Генерация текстового обоснования сигнала
   */
  private generateReasoning(sweep: LiquiditySweep, structure: StructureChange, score: any): string {
    const parts: string[] = [];

    parts.push(
      `Liquidity Sweep на $${sweep.sweepPrice.toFixed(2)} (фитиль ${(sweep.wickSize * 100).toFixed(0)}%)`
    );

    parts.push(`${structure.type} ${structure.direction === 'up' ? 'вверх' : 'вниз'}`);

    if (score.breakdown.volumeScore > 0) {
      parts.push('Подтверждение объёмом');
    }

    if (score.breakdown.htfScore > 0) {
      parts.push('Совпадение с HTF уровнем');
    }

    if (score.breakdown.divergenceScore > 0) {
      parts.push('RSI дивергенция');
    }

    return parts.join('. ') + '.';
  }

  /**
   * Валидация внешнего сигнала
   */
  validateSignal(
    candles: Candlestick[],
    externalSignal: { direction: SignalDirection; price: number }
  ): { isValid: boolean; reasons: string[] } {
    const reasons: string[] = [];

    // Проверяем наличие sweep в направлении сигнала
    const recentSweeps = this.store.getState().sweeps.slice(-5);
    const hasSweep = recentSweeps.some(s => {
      if (externalSignal.direction === 'BUY') {
        return s.direction === 'down';
      } else {
        return s.direction === 'up';
      }
    });

    if (!hasSweep) {
      reasons.push('Нет подтверждающего liquidity sweep');
    }

    // Проверяем структуру
    const recentStructures = this.store.getState().structures.slice(-5);
    const hasStructure = recentStructures.some(s => {
      if (externalSignal.direction === 'BUY') {
        return s.direction === 'up';
      } else {
        return s.direction === 'down';
      }
    });

    if (!hasStructure) {
      reasons.push('Нет структурного подтверждения');
    }

    return {
      isValid: reasons.length === 0,
      reasons,
    };
  }

  /**
   * Получить store для доступа к данным
   */
  getStore(): LiquidityStore {
    return this.store;
  }

  /**
   * Очистить все данные
   */
  reset(): void {
    this.store.reset();
  }
}
