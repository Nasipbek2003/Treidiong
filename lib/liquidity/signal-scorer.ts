/**
 * SignalScorer - Оценка силы торговых сигналов
 * 
 * Рассчитывает score (0-100) на основе:
 * - Liquidity Sweep (25 баллов)
 * - Break of Structure (30 баллов)
 * - RSI Divergence (15 баллов)
 * - Volume Spike (10 баллов)
 * - HTF Level (20 баллов)
 */

import {
  SignalScore,
  SignalScoreBreakdown,
  LiquiditySweep,
  StructureChange,
  Candlestick,
  LiquidityPool,
  ScoreWeights,
} from './types';

export class SignalScorer {
  private weights: ScoreWeights;

  constructor(weights?: Partial<ScoreWeights>) {
    this.weights = {
      sweep: weights?.sweep ?? 20,
      bos: weights?.bos ?? 25,
      divergence: weights?.divergence ?? 15,
      volume: weights?.volume ?? 10,
      htf: weights?.htf ?? 10,
      triangle: weights?.triangle ?? 15,
      session: weights?.session ?? 5,
    };
  }

  /**
   * Рассчитывает общий score сигнала
   */
  calculateScore(
    sweep: LiquiditySweep | null,
    structureChange: StructureChange | null,
    candle: Candlestick,
    volumeData: number[],
    rsiData: number[],
    htfPools: LiquidityPool[],
    triangleData?: { isValid: boolean; hasBreakout: boolean; hasRetest: boolean; compressionRatio: number } | null,
    session?: 'ASIAN' | 'LONDON' | 'NEW_YORK' | 'OVERLAP'
  ): SignalScore {
    const breakdown: SignalScoreBreakdown = {
      sweepScore: 0,
      bosScore: 0,
      divergenceScore: 0,
      volumeScore: 0,
      htfScore: 0,
      triangleScore: 0,
      sessionScore: 0,
    };

    const components: string[] = [];

    // 1. Liquidity Sweep Score (0-20)
    if (sweep) {
      breakdown.sweepScore = this.scoreSweep(sweep);
      components.push(`Liquidity Sweep (${breakdown.sweepScore.toFixed(1)})`);
    }

    // 2. Break of Structure Score (0-25)
    if (structureChange) {
      breakdown.bosScore = this.scoreBOS(structureChange);
      components.push(`${structureChange.type} (${breakdown.bosScore.toFixed(1)})`);
    }

    // 3. RSI Divergence Score (0-15)
    if (rsiData.length >= 3) {
      breakdown.divergenceScore = this.scoreDivergence(rsiData);
      if (breakdown.divergenceScore > 0) {
        components.push(`RSI Divergence (${breakdown.divergenceScore.toFixed(1)})`);
      }
    }

    // 4. Volume Spike Score (0-10)
    if (volumeData.length > 0) {
      breakdown.volumeScore = this.scoreVolume(candle.volume, volumeData);
      if (breakdown.volumeScore > 0) {
        components.push(`Volume Spike (${breakdown.volumeScore.toFixed(1)})`);
      }
    }

    // 5. HTF Level Score (0-10)
    if (htfPools.length > 0) {
      breakdown.htfScore = this.scoreHTFLevel(candle, htfPools);
      if (breakdown.htfScore > 0) {
        components.push(`HTF Level (${breakdown.htfScore.toFixed(1)})`);
      }
    }

    // 6. Triangle Score (0-15)
    if (triangleData) {
      breakdown.triangleScore = this.scoreTriangle(triangleData);
      if (breakdown.triangleScore > 0) {
        components.push(`Triangle Pattern (${breakdown.triangleScore.toFixed(1)})`);
      }
    }

    // 7. Session Score (0-5)
    if (session) {
      breakdown.sessionScore = this.scoreSession(session);
      if (breakdown.sessionScore > 0) {
        components.push(`${session} Session (${breakdown.sessionScore.toFixed(1)})`);
      }
    }

    // Рассчитываем общий score
    const totalScore =
      breakdown.sweepScore +
      breakdown.bosScore +
      breakdown.divergenceScore +
      breakdown.volumeScore +
      breakdown.htfScore +
      (breakdown.triangleScore || 0) +
      (breakdown.sessionScore || 0);

    return {
      totalScore: Math.min(totalScore, 100),
      breakdown,
      components,
    };
  }

  /**
   * Оценивает качество liquidity sweep
   */
  private scoreSweep(sweep: LiquiditySweep): number {
    let score = 0;

    // Базовый балл за наличие sweep
    score += this.weights.sweep * 0.4;

    // Бонус за размер фитиля (чем больше, тем лучше)
    score += this.weights.sweep * 0.3 * sweep.wickSize;

    // Бонус за силу отката
    score += this.weights.sweep * 0.3 * sweep.rejectionStrength;

    return score;
  }

  /**
   * Оценивает качество Break of Structure
   */
  private scoreBOS(structureChange: StructureChange): number {
    let score = 0;

    // CHOCH важнее BOS (смена тренда)
    if (structureChange.type === 'CHOCH') {
      score += this.weights.bos * 0.7;
    } else {
      score += this.weights.bos * 0.5;
    }

    // Бонус за значимость
    score += this.weights.bos * 0.3 * structureChange.significance;

    return score;
  }

  /**
   * Оценивает RSI дивергенцию
   */
  private scoreDivergence(rsiData: number[]): number {
    if (rsiData.length < 3) {
      return 0;
    }

    const recent = rsiData.slice(-3);
    
    // Проверяем дивергенцию
    const hasDivergence =
      (recent[2] > recent[0] && recent[1] < recent[0]) ||
      (recent[2] < recent[0] && recent[1] > recent[0]);

    if (!hasDivergence) {
      return 0;
    }

    // Рассчитываем силу дивергенции
    const divergenceStrength = Math.abs(recent[2] - recent[0]) / 100;

    return this.weights.divergence * Math.min(divergenceStrength, 1);
  }

  /**
   * Оценивает volume spike
   */
  private scoreVolume(currentVolume: number, volumeData: number[]): number {
    if (volumeData.length === 0) {
      return 0;
    }

    const recentVolumes = volumeData.slice(-20);
    const avgVolume = recentVolumes.reduce((sum, v) => sum + v, 0) / recentVolumes.length;

    if (avgVolume === 0) {
      return 0;
    }

    const volumeRatio = currentVolume / avgVolume;

    // Нет spike
    if (volumeRatio < 1.5) {
      return 0;
    }

    // Нормализуем (1.5x = 0, 3x+ = max)
    const normalizedRatio = Math.min((volumeRatio - 1.5) / 1.5, 1);

    return this.weights.volume * normalizedRatio;
  }

  /**
   * Оценивает близость к HTF уровню
   */
  private scoreHTFLevel(candle: Candlestick, htfPools: LiquidityPool[]): number {
    if (htfPools.length === 0) {
      return 0;
    }

    // Находим ближайший HTF уровень
    let minDistance = Infinity;

    for (const pool of htfPools) {
      const distance = Math.abs(candle.close - pool.price) / candle.close;
      minDistance = Math.min(minDistance, distance);
    }

    // Если дальше 1%, не учитываем
    if (minDistance > 0.01) {
      return 0;
    }

    // Чем ближе, тем выше score (0.01 = 0, 0 = max)
    const proximity = 1 - minDistance / 0.01;

    return this.weights.htf * proximity;
  }

  /**
   * Оценивает качество треугольника
   */
  private scoreTriangle(triangleData: { 
    isValid: boolean; 
    hasBreakout: boolean; 
    hasRetest: boolean; 
    compressionRatio: number 
  }): number {
    if (!triangleData.isValid) {
      return 0;
    }

    let score = 0;

    // Качество треугольника (сжатие)
    if (triangleData.compressionRatio < 0.7) {
      score += (this.weights.triangle || 15) * 0.5; // 50% за хорошее сжатие
    }

    // Тип сигнала
    if (triangleData.hasBreakout && triangleData.hasRetest) {
      score += (this.weights.triangle || 15) * 0.5; // 50% за пробой + ретест (лучший вход)
    } else if (triangleData.hasBreakout) {
      score += (this.weights.triangle || 15) * 0.3; // 30% за только пробой
    }

    return score;
  }

  /**
   * Оценивает торговую сессию
   */
  private scoreSession(session: 'ASIAN' | 'LONDON' | 'NEW_YORK' | 'OVERLAP'): number {
    switch (session) {
      case 'OVERLAP':
        return this.weights.session || 5; // Максимум за лучшее время
      case 'LONDON':
      case 'NEW_YORK':
        return (this.weights.session || 5) * 0.7; // 70%
      case 'ASIAN':
        return (this.weights.session || 5) * 0.3; // 30% - худшее время
    }
  }

  /**
   * Генерирует текстовое объяснение score
   */
  generateScoreExplanation(score: SignalScore): string {
    const lines: string[] = [];

    lines.push(`Total Score: ${score.totalScore.toFixed(1)}/100`);
    lines.push('');
    lines.push('Breakdown:');

    if (score.breakdown.sweepScore > 0) {
      lines.push(`  • Liquidity Sweep: ${score.breakdown.sweepScore.toFixed(1)}/${this.weights.sweep}`);
    }

    if (score.breakdown.bosScore > 0) {
      lines.push(`  • Structure Change: ${score.breakdown.bosScore.toFixed(1)}/${this.weights.bos}`);
    }

    if (score.breakdown.divergenceScore > 0) {
      lines.push(`  • RSI Divergence: ${score.breakdown.divergenceScore.toFixed(1)}/${this.weights.divergence}`);
    }

    if (score.breakdown.volumeScore > 0) {
      lines.push(`  • Volume Spike: ${score.breakdown.volumeScore.toFixed(1)}/${this.weights.volume}`);
    }

    if (score.breakdown.htfScore > 0) {
      lines.push(`  • HTF Level: ${score.breakdown.htfScore.toFixed(1)}/${this.weights.htf}`);
    }

    return lines.join('\n');
  }
}
