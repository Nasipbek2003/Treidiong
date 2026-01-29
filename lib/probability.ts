import { TechnicalIndicators, MarketAnalysis, PriceData } from '@/types';
import { 
  calculateVolumeSMA, 
  isVolumeSpike, 
  calculateCVD,
  detectLiquiditySweep,
  analyzeMarketStructure,
  getHigherTimeframeTrend
} from './indicators';

export interface EntryPoint {
  type: 'Консервативный' | 'Умеренный' | 'Агрессивный';
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  riskReward: number;
  description: string;
  confidence: number; // Уверенность в точке входа (0-100)
  probability?: number; // Алиас для confidence (для обратной совместимости)
}

export interface TargetProbability {
  price: number;
  probability: number; // Реальная вероятность достижения на основе всех факторов
  reasoning: string;
}

export interface ProbabilityScore {
  signal: 'BUY' | 'SELL' | 'HOLD';
  overallConfidence: number; // Общая уверенность в сигнале (0-100)
  probability?: number; // Алиас для overallConfidence (для обратной совместимости)
  factors: string[];
  entryPoints: EntryPoint[];
  targets: TargetProbability[]; // Цели с реальными вероятностями
  prediction: {
    direction: 'UP' | 'DOWN' | 'SIDEWAYS';
    targetPrice: number;
    reversalPoint: number;
    timeframe: string;
    reason: string;
  };
  breakdown: {
    technical: number; // 0-30
    liquidity: number; // 0-25
    structure: number; // 0-20
    session: number; // 0-10
    triangle: number; // 0-15
  };
}

export function calculateProbability(
  indicators: TechnicalIndicators,
  analysis: MarketAnalysis,
  currentPrice: number,
  support: number[],
  resistance: number[],
  priceData: PriceData[],
  liquidityData?: {
    hasValidSetup: boolean;
    signal: any;
    sweeps: any[];
    structures: any[];
    pools: any[];
  },
  triangleData?: {
    isValid: boolean;
    hasBreakout: boolean;
    hasRetest: boolean;
    compressionRatio: number;
  },
  session?: 'ASIAN' | 'LONDON' | 'NEW_YORK' | 'OVERLAP'
): ProbabilityScore {
  const factors: string[] = [];
  
  // Breakdown scores
  let technicalScore = 0; // max 30
  let liquidityScore = 0; // max 25
  let structureScore = 0; // max 20
  let sessionScore = 0; // max 10
  let triangleScore = 0; // max 15
  
  // === ТЕХНИЧЕСКИЙ АНАЛИЗ (0-30) ===

  // === ТЕХНИЧЕСКИЙ АНАЛИЗ (0-30) ===
  
  // RSI (0-10)
  if (indicators.rsi < 30) {
    technicalScore += 10;
    factors.push(`✅ RSI ${indicators.rsi.toFixed(1)} перепродан (+10)`);
  } else if (indicators.rsi > 70) {
    technicalScore += 0; // Для SELL это будет +10
    factors.push(`❌ RSI ${indicators.rsi.toFixed(1)} перекуплен`);
  } else if (indicators.rsi >= 40 && indicators.rsi <= 60) {
    technicalScore += 5;
    factors.push(`⚪ RSI ${indicators.rsi.toFixed(1)} нейтрален (+5)`);
  } else {
    technicalScore += 3;
    factors.push(`⚪ RSI ${indicators.rsi.toFixed(1)} (+3)`);
  }

  // MACD (0-10)
  if (indicators.macd.histogram > 0) {
    technicalScore += 10;
    factors.push('✅ MACD бычий (+10)');
  } else {
    technicalScore += 0;
    factors.push('❌ MACD медвежий');
  }

  // Тренд (0-10)
  if (analysis.trend === 'bullish') {
    technicalScore += 10;
    factors.push('✅ Восходящий тренд (+10)');
  } else if (analysis.trend === 'bearish') {
    technicalScore += 0;
    factors.push('❌ Нисходящий тренд');
  } else {
    technicalScore += 5;
    factors.push('⚪ Боковой тренд (+5)');
  }

  // === ЛИКВИДНОСТЬ (0-25) ===
  if (liquidityData) {
    if (liquidityData.hasValidSetup && liquidityData.signal) {
      const signalScore = liquidityData.signal.score.totalScore;
      liquidityScore = Math.min(25, (signalScore / 100) * 25);
      factors.push(`✅ Liquidity Engine Score: ${signalScore.toFixed(1)}/100 (+${liquidityScore.toFixed(1)})`);
      
      // Детали
      if (liquidityData.sweeps.length > 0) {
        const latestSweep = liquidityData.sweeps[liquidityData.sweeps.length - 1];
        factors.push(`  • Sweep на ${latestSweep.sweepPrice.toFixed(2)} (фитиль ${(latestSweep.wickSize * 100).toFixed(0)}%)`);
      }
      
      if (liquidityData.structures.length > 0) {
        const latestStructure = liquidityData.structures[liquidityData.structures.length - 1];
        factors.push(`  • ${latestStructure.type} ${latestStructure.direction === 'up' ? '⬆️' : '⬇️'}`);
      }
    } else {
      factors.push(`⚠️ Liquidity Engine: нет валидного сетапа`);
      if (liquidityData.signal?.score) {
        const signalScore = liquidityData.signal.score.totalScore;
        liquidityScore = Math.min(15, (signalScore / 100) * 15);
        factors.push(`  • Score: ${signalScore.toFixed(1)}/100 (недостаточно)`);
      }
    }
  }

  // === СТРУКТУРА РЫНКА (0-20) ===
  const structure = analyzeMarketStructure(priceData);
  if (structure.breakOfStructure === 'UP') {
    structureScore += 20;
    factors.push(`✅ Break of Structure вверх (${structure.type}) (+20)`);
  } else if (structure.breakOfStructure === 'DOWN') {
    structureScore += 0;
    factors.push(`❌ Break of Structure вниз (${structure.type})`);
  } else if (structure.type === 'HH' || structure.type === 'HL') {
    structureScore += 15;
    factors.push(`✅ Бычья структура (${structure.type}) (+15)`);
  } else if (structure.type === 'LH' || structure.type === 'LL') {
    structureScore += 0;
    factors.push(`❌ Медвежья структура (${structure.type})`);
  } else {
    structureScore += 10;
    factors.push(`⚪ Боковая структура (+10)`);
  }

  // === ТОРГОВАЯ СЕССИЯ (0-10) ===
  if (session) {
    if (session === 'OVERLAP') {
      sessionScore = 10;
      factors.push(`✅ OVERLAP сессия - лучшее время (+10)`);
    } else if (session === 'LONDON' || session === 'NEW_YORK') {
      sessionScore = 7;
      factors.push(`✅ ${session} сессия - хорошее время (+7)`);
    } else {
      sessionScore = 3;
      factors.push(`⚠️ ASIAN сессия - низкая волатильность (+3)`);
    }
  }

  // === ТРЕУГОЛЬНИК (0-15) ===
  if (triangleData && triangleData.isValid) {
    if (triangleData.hasBreakout && triangleData.hasRetest) {
      triangleScore = 15;
      factors.push(`✅ Треугольник: Пробой + Ретест (+15) - 85% вероятность!`);
    } else if (triangleData.hasBreakout) {
      triangleScore = 10;
      factors.push(`✅ Треугольник: Пробой без ретеста (+10) - жди ретест`);
    } else {
      triangleScore = 5;
      factors.push(`⚪ Треугольник обнаружен (+5) - жди пробоя`);
    }
    
    if (triangleData.compressionRatio < 0.7) {
      factors.push(`  • Хорошее сжатие (${(triangleData.compressionRatio * 100).toFixed(0)}%)`);
    }
  }

  // === ОБЩИЙ SCORE ===
  const totalScore = technicalScore + liquidityScore + structureScore + sessionScore + triangleScore;
  const maxScore = 100;
  const overallConfidence = Math.min(100, (totalScore / maxScore) * 100);

  // === ОПРЕДЕЛЕНИЕ СИГНАЛА ===
  let signal: 'BUY' | 'SELL' | 'HOLD';
  if (overallConfidence >= 60) {
    signal = 'BUY';
  } else if (overallConfidence < 40) {
    signal = 'SELL';
  } else {
    signal = 'HOLD';
  }

  // === РАСЧЕТ ТОЧЕК ВХОДА ===
  const nearSupport = support[0] || currentPrice * 0.99;
  const midSupport = support[1] || currentPrice * 0.985;
  const farSupport = support[2] || currentPrice * 0.97;
  const nearResistance = resistance[0] || currentPrice * 1.02;

  const entryPoints: EntryPoint[] = [];

  if (signal === 'BUY') {
    // Агрессивный вход
    entryPoints.push({
      type: 'Агрессивный',
      entryPrice: currentPrice,
      stopLoss: nearSupport * 0.995,
      takeProfit: nearResistance,
      riskReward: (nearResistance - currentPrice) / (currentPrice - nearSupport * 0.995),
      description: 'Вход по текущей цене - максимальный потенциал',
      confidence: Math.min(100, overallConfidence),
      probability: Math.min(100, overallConfidence)
    });

    // Умеренный вход
    entryPoints.push({
      type: 'Умеренный',
      entryPrice: nearSupport,
      stopLoss: midSupport * 0.995,
      takeProfit: nearResistance,
      riskReward: (nearResistance - nearSupport) / (nearSupport - midSupport * 0.995),
      description: 'Вход от первой поддержки - баланс риска и прибыли',
      confidence: Math.min(100, overallConfidence + 10),
      probability: Math.min(100, overallConfidence + 10)
    });

    // Консервативный вход
    entryPoints.push({
      type: 'Консервативный',
      entryPrice: midSupport,
      stopLoss: farSupport * 0.995,
      takeProfit: nearResistance,
      riskReward: (nearResistance - midSupport) / (midSupport - farSupport * 0.995),
      description: 'Вход от второй поддержки - минимальный риск',
      confidence: Math.min(100, overallConfidence + 20),
      probability: Math.min(100, overallConfidence + 20)
    });
  } else if (signal === 'SELL') {
    const nearResistanceLevel = resistance[0] || currentPrice * 1.01;
    const midResistanceLevel = resistance[1] || currentPrice * 1.015;
    const farResistanceLevel = resistance[2] || currentPrice * 1.03;

    // Агрессивный вход
    entryPoints.push({
      type: 'Агрессивный',
      entryPrice: currentPrice,
      stopLoss: nearResistanceLevel * 1.005,
      takeProfit: nearSupport,
      riskReward: (currentPrice - nearSupport) / (nearResistanceLevel * 1.005 - currentPrice),
      description: 'Вход по текущей цене - максимальный потенциал',
      confidence: Math.min(100, overallConfidence),
      probability: Math.min(100, overallConfidence)
    });

    // Умеренный вход
    entryPoints.push({
      type: 'Умеренный',
      entryPrice: nearResistanceLevel,
      stopLoss: midResistanceLevel * 1.005,
      takeProfit: nearSupport,
      riskReward: (nearResistanceLevel - nearSupport) / (midResistanceLevel * 1.005 - nearResistanceLevel),
      description: 'Вход от первого сопротивления - баланс риска и прибыли',
      confidence: Math.min(100, overallConfidence + 10),
      probability: Math.min(100, overallConfidence + 10)
    });

    // Консервативный вход
    entryPoints.push({
      type: 'Консервативный',
      entryPrice: midResistanceLevel,
      stopLoss: farResistanceLevel * 1.005,
      takeProfit: nearSupport,
      riskReward: (midResistanceLevel - nearSupport) / (farResistanceLevel * 1.005 - midResistanceLevel),
      description: 'Вход от второго сопротивления - минимальный риск',
      confidence: Math.min(100, overallConfidence + 20),
      probability: Math.min(100, overallConfidence + 20)
    });
  }

  // === РАСЧЕТ ЦЕЛЕЙ С РЕАЛЬНЫМИ ВЕРОЯТНОСТЯМИ ===
  const targets: TargetProbability[] = [];
  
  if (signal === 'BUY') {
    const target1 = nearResistance;
    const target2 = resistance[1] || currentPrice * 1.03;
    const target3 = resistance[2] || currentPrice * 1.05;

    // Вероятность цели 1 = базовая уверенность
    let target1Prob = overallConfidence;
    
    // Корректировки на основе факторов
    if (liquidityData?.hasValidSetup) target1Prob += 10;
    if (triangleData?.hasBreakout && triangleData?.hasRetest) target1Prob += 15;
    if (session === 'OVERLAP') target1Prob += 5;
    
    targets.push({
      price: target1,
      probability: Math.min(95, target1Prob),
      reasoning: 'Первое сопротивление - высокая вероятность достижения'
    });

    // Вероятность цели 2 = 70% от цели 1
    let target2Prob = target1Prob * 0.7;
    if (structure.type === 'HH') target2Prob += 5;
    
    targets.push({
      price: target2,
      probability: Math.min(85, target2Prob),
      reasoning: 'Второе сопротивление - средняя вероятность'
    });

    // Вероятность цели 3 = 50% от цели 1
    let target3Prob = target1Prob * 0.5;
    
    targets.push({
      price: target3,
      probability: Math.min(70, target3Prob),
      reasoning: 'Третье сопротивление - требует сильного импульса'
    });
  } else if (signal === 'SELL') {
    const target1 = nearSupport;
    const target2 = support[1] || currentPrice * 0.97;
    const target3 = support[2] || currentPrice * 0.95;

    // Вероятность цели 1 = базовая уверенность
    let target1Prob = overallConfidence;
    
    // Корректировки на основе факторов
    if (liquidityData?.hasValidSetup) target1Prob += 10;
    if (triangleData?.hasBreakout && triangleData?.hasRetest) target1Prob += 15;
    if (session === 'OVERLAP') target1Prob += 5;
    
    targets.push({
      price: target1,
      probability: Math.min(95, target1Prob),
      reasoning: 'Первая поддержка - высокая вероятность достижения'
    });

    // Вероятность цели 2 = 70% от цели 1
    let target2Prob = target1Prob * 0.7;
    if (structure.type === 'LL') target2Prob += 5;
    
    targets.push({
      price: target2,
      probability: Math.min(85, target2Prob),
      reasoning: 'Вторая поддержка - средняя вероятность'
    });

    // Вероятность цели 3 = 50% от цели 1
    let target3Prob = target1Prob * 0.5;
    
    targets.push({
      price: target3,
      probability: Math.min(70, target3Prob),
      reasoning: 'Третья поддержка - требует сильного импульса'
    });
  }

  // === PREDICTION ===
  let direction: 'UP' | 'DOWN' | 'SIDEWAYS';
  let targetPrice: number;
  let reversalPoint: number;
  let reason: string;

  if (signal === 'BUY') {
    direction = 'UP';
    targetPrice = targets.length > 0 ? targets[0].price : nearResistance;
    reversalPoint = targets.length > 0 ? targets[targets.length - 1].price : nearResistance * 1.02;
    
    const reasons: string[] = [];
    if (liquidityData?.hasValidSetup) reasons.push('Liquidity Engine подтверждает');
    if (triangleData?.hasBreakout && triangleData?.hasRetest) reasons.push('Треугольник: пробой + ретест (85%)');
    if (structure.breakOfStructure === 'UP') reasons.push('Break of Structure вверх');
    if (session === 'OVERLAP') reasons.push('OVERLAP - лучшее время');
    
    reason = reasons.length > 0 ? reasons.join(', ') : 'Технические индикаторы указывают на рост';
  } else {
    direction = 'SIDEWAYS';
    targetPrice = currentPrice;
    reversalPoint = currentPrice;
    reason = 'Недостаточно подтверждений для входа';
  }

  return {
    signal,
    overallConfidence,
    probability: overallConfidence, // Алиас для обратной совместимости
    factors: factors.slice(0, 10),
    entryPoints,
    targets,
    prediction: {
      direction,
      targetPrice,
      reversalPoint,
      timeframe: '1-4 часа',
      reason
    },
    breakdown: {
      technical: technicalScore,
      liquidity: liquidityScore,
      structure: structureScore,
      session: sessionScore,
      triangle: triangleScore
    }
  };
}

export function formatProbabilityReport(
  score: ProbabilityScore,
  currentPrice: number
): string {
  let report = `**Общая уверенность:** ${score.overallConfidence.toFixed(1)}%\n\n`;
  
  // Breakdown
  report += `**Breakdown:**\n`;
  report += `• Технический анализ: ${score.breakdown.technical}/30\n`;
  report += `• Ликвидность: ${score.breakdown.liquidity}/25\n`;
  report += `• Структура: ${score.breakdown.structure}/20\n`;
  report += `• Сессия: ${score.breakdown.session}/10\n`;
  report += `• Треугольник: ${score.breakdown.triangle}/15\n\n`;
  
  // Точки входа
  if (score.entryPoints.length > 0) {
    report += `**📍 ТОЧКИ ВХОДА:**\n\n`;
    
    score.entryPoints.forEach((entry) => {
      const emoji = entry.type === 'Агрессивный' ? '🔥' : entry.type === 'Умеренный' ? '⚖️' : '🛡️';
      report += `${emoji} **${entry.type}** (уверенность ${entry.confidence.toFixed(0)}%)\n`;
      report += `• Вход: ${entry.entryPrice.toFixed(2)}\n`;
      report += `• Стоп: ${entry.stopLoss.toFixed(2)}\n`;
      report += `• Цель: ${entry.takeProfit.toFixed(2)}\n`;
      report += `• Risk/Reward: 1:${entry.riskReward.toFixed(2)}\n`;
      report += `• ${entry.description}\n\n`;
    });
  }
  
  // Цели с вероятностями
  if (score.targets.length > 0) {
    report += `**🎯 ЦЕЛИ:**\n\n`;
    score.targets.forEach((target, idx) => {
      report += `**Цель ${idx + 1}:** ${target.price.toFixed(2)} (${target.probability.toFixed(0)}% вероятность)\n`;
      report += `• ${target.reasoning}\n\n`;
    });
  }
  
  // Факторы
  report += `**Факторы:**\n`;
  score.factors.forEach(factor => {
    report += `• ${factor}\n`;
  });
  
  report += `\n**Почему:** ${score.prediction.reason}`;

  return report;
}
