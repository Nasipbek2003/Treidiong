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
  probability: number;
  stopLoss: number;
  takeProfit: number;
  riskReward: number;
  description: string;
}

export interface ProbabilityScore {
  signal: 'BUY' | 'SELL' | 'HOLD';
  probability: number;
  factors: string[];
  entryPoints: EntryPoint[];
  prediction: {
    direction: 'UP' | 'DOWN' | 'SIDEWAYS';
    targetPrice: number;
    reversalPoint: number;
    timeframe: string;
    reason: string;
  };
}

export function calculateProbability(
  indicators: TechnicalIndicators,
  analysis: MarketAnalysis,
  currentPrice: number,
  support: number[],
  resistance: number[],
  priceData: PriceData[]
): ProbabilityScore {
  const factors: string[] = [];
  let bullishCount = 0; // Сколько критериев за покупку
  let bearishCount = 0; // Сколько критериев за продажу
  const totalCriteria = 10; // Всего критериев

  // 1. RSI (10%)
  if (indicators.rsi < 30) {
    bullishCount++;
    factors.push(`✅ RSI ${indicators.rsi.toFixed(1)} перепродан`);
  } else if (indicators.rsi > 70) {
    bearishCount++;
    factors.push(`❌ RSI ${indicators.rsi.toFixed(1)} перекуплен`);
  } else if (indicators.rsi >= 40 && indicators.rsi <= 60) {
    bullishCount += 0.5;
    factors.push(`⚪ RSI ${indicators.rsi.toFixed(1)} нейтрален`);
  } else {
    factors.push(`⚪ RSI ${indicators.rsi.toFixed(1)}`);
  }

  // 2. MACD (10%)
  if (indicators.macd.histogram > 0) {
    bullishCount++;
    factors.push('✅ MACD бычий');
  } else {
    bearishCount++;
    factors.push('❌ MACD медвежий');
  }

  // 3. Тренд (10%)
  if (analysis.trend === 'bullish') {
    bullishCount++;
    factors.push('✅ Восходящий тренд');
  } else if (analysis.trend === 'bearish') {
    bearishCount++;
    factors.push('❌ Нисходящий тренд');
  } else {
    factors.push('⚪ Боковой тренд');
  }

  // 4. Скользящие средние (10%)
  if (indicators.sma20 > indicators.sma50) {
    bullishCount++;
    factors.push('✅ SMA20 > SMA50');
  } else {
    bearishCount++;
    factors.push('❌ SMA20 < SMA50');
  }

  // 5. Волатильность (10%)
  if (analysis.volatility < 15) {
    bullishCount += 0.5;
    factors.push(`✅ Низкая волатильность ${analysis.volatility.toFixed(1)}%`);
  } else if (analysis.volatility > 30) {
    bearishCount += 0.3;
    factors.push(`⚠️ Высокая волатильность ${analysis.volatility.toFixed(1)}%`);
  }

  // 6. Volume & Money Flow (10%)
  const volumes = priceData.map(d => d.volume);
  const prices = priceData.map(d => d.close);
  const volumeSMA = calculateVolumeSMA(volumes);
  const currentVolume = volumes[volumes.length - 1];
  const cvd = calculateCVD(priceData);
  const prevCVD = calculateCVD(priceData.slice(0, -5));
  
  if (isVolumeSpike(currentVolume, volumeSMA)) {
    const priceUp = prices[prices.length - 1] > prices[prices.length - 2];
    if (priceUp) {
      bullishCount++;
      factors.push('✅ 📊 Объем подтверждает рост');
    } else {
      bearishCount++;
      factors.push('❌ 📊 Объем без роста цены');
    }
  } else if (currentVolume < volumeSMA * 0.7) {
    const priceUp = prices[prices.length - 1] > prices[prices.length - 2];
    if (priceUp) {
      bearishCount++;
      factors.push('❌ 📊 Рост без объема (фейк)');
    } else {
      bearishCount += 0.5;
      factors.push('⚠️ 📊 Падение без объема');
    }
  }
  
  // 7. CVD (10%)
  const cvdGrowing = cvd > prevCVD;
  const priceGrowing = prices[prices.length - 1] > prices[prices.length - 6];
  
  if (cvdGrowing && priceGrowing) {
    bullishCount++;
    factors.push('✅ 💰 CVD растет с ценой');
  } else if (!cvdGrowing && priceGrowing) {
    bearishCount++;
    factors.push('❌ 💰 CVD падает, цена растет (разгрузка)');
  }

  // 8. Liquidity Sweep (10%)
  const liquiditySweep = detectLiquiditySweep(priceData);
  
  if (liquiditySweep.isSweep) {
    if (liquiditySweep.direction === 'DOWN' && indicators.rsi > 50) {
      bullishCount++;
      factors.push('✅ 🎯 Сбор стопов вниз → разворот вверх');
    } else if (liquiditySweep.direction === 'UP' && indicators.rsi < 50) {
      bearishCount++;
      factors.push('❌ 🎯 Сбор стопов вверх → разворот вниз');
    } else {
      bearishCount += 0.5;
      factors.push('⚠️ 🎯 Ложный пробой');
    }
  }

  // 9. Market Structure (10%)
  const structure = analyzeMarketStructure(priceData);
  
  if (structure.breakOfStructure === 'UP') {
    bullishCount++;
    factors.push(`✅ 📈 Break of Structure вверх (${structure.type})`);
  } else if (structure.breakOfStructure === 'DOWN') {
    bearishCount++;
    factors.push(`❌ 📉 Break of Structure вниз (${structure.type})`);
  } else if (structure.type === 'RANGE') {
    factors.push('⚪ ↔️ Рынок в диапазоне');
  } else {
    factors.push(`⚪ 📊 Структура: ${structure.type}`);
  }

  // 10. Multi-Timeframe (10%)
  const htfTrend = getHigherTimeframeTrend(priceData, 12);
  const currentTrendBullish = analysis.trend === 'bullish';
  
  if (currentTrendBullish && htfTrend === 'bullish') {
    bullishCount++;
    factors.push('✅ ⏰ 5m и 1H совпадают (BUY)');
  } else if (!currentTrendBullish && htfTrend === 'bearish') {
    bearishCount++;
    factors.push('❌ ⏰ 5m и 1H совпадают (SELL)');
  } else if (currentTrendBullish && htfTrend === 'bearish') {
    bearishCount += 0.5;
    factors.push('⚠️ ⏰ 5m BUY, но 1H SELL');
  } else if (!currentTrendBullish && htfTrend === 'bullish') {
    bullishCount += 0.5;
    factors.push('⚠️ ⏰ 5m SELL, но 1H BUY');
  }

  // Рассчитываем вероятность: каждый критерий = 10%
  const bullishProbability = Math.round((bullishCount / totalCriteria) * 100);
  const bearishProbability = Math.round((bearishCount / totalCriteria) * 100);

  // Логирование для отладки
  if (typeof window !== 'undefined') {
    console.log('🎲 Расчет вероятности:', {
      'Бычьих критериев': bullishCount,
      'Медвежьих критериев': bearishCount,
      'Бычья вероятность': `${bullishProbability}%`,
      'Медвежья вероятность': `${bearishProbability}%`,
      'Топ-8 факторов': factors.slice(0, 8)
    });
  }

  let signal: 'BUY' | 'SELL' | 'HOLD';
  let probability: number;

  if (bullishProbability >= 60) {
    signal = 'BUY';
    probability = bullishProbability;
  } else if (bearishProbability >= 60) {
    signal = 'SELL';
    probability = bearishProbability;
  } else {
    signal = 'HOLD';
    probability = Math.max(bullishProbability, bearishProbability);
  }

  // Прогноз движения и 3 точки входа
  let direction: 'UP' | 'DOWN' | 'SIDEWAYS';
  let targetPrice: number;
  let reversalPoint: number;
  let reason: string;
  let entryPoints: EntryPoint[] = [];

  if (signal === 'BUY') {
    direction = 'UP';
    targetPrice = resistance[0] || currentPrice * 1.02;
    reversalPoint = resistance[0] ? resistance[0] * 1.005 : currentPrice * 1.025;
    
    // 3 точки входа для ПОКУПКИ
    const nearSupport = support[0] || currentPrice * 0.99;
    const midSupport = support[1] || currentPrice * 0.985;
    const farSupport = support[2] || currentPrice * 0.97;
    
    entryPoints = [
      {
        type: 'Агрессивный',
        entryPrice: currentPrice,
        probability: probability,
        stopLoss: nearSupport * 0.995,
        takeProfit: resistance[0] || currentPrice * 1.02,
        riskReward: ((resistance[0] || currentPrice * 1.02) - currentPrice) / (currentPrice - nearSupport * 0.995),
        description: 'Вход по текущей цене - максимальный потенциал, но выше риск'
      },
      {
        type: 'Умеренный',
        entryPrice: nearSupport,
        probability: Math.min(100, probability + 10),
        stopLoss: midSupport * 0.995,
        takeProfit: resistance[0] || currentPrice * 1.02,
        riskReward: ((resistance[0] || currentPrice * 1.02) - nearSupport) / (nearSupport - midSupport * 0.995),
        description: 'Вход от первой поддержки - баланс риска и прибыли'
      },
      {
        type: 'Консервативный',
        entryPrice: midSupport,
        probability: Math.min(100, probability + 20),
        stopLoss: farSupport * 0.995,
        takeProfit: resistance[0] || currentPrice * 1.02,
        riskReward: ((resistance[0] || currentPrice * 1.02) - midSupport) / (midSupport - farSupport * 0.995),
        description: 'Вход от второй поддержки - минимальный риск, высокая вероятность'
      }
    ];
    
    if (indicators.rsi < 30 && liquiditySweep.isSweep) {
      reason = 'RSI перепродан + сбор стопов - сильный отскок';
    } else if (cvdGrowing && structure.breakOfStructure === 'UP') {
      reason = 'CVD растет + пробой структуры - продолжение роста';
    } else if (analysis.trend === 'bullish' && htfTrend === 'bullish') {
      reason = 'Совпадение трендов на всех таймфреймах';
    } else {
      reason = 'Технические индикаторы указывают на рост';
    }
  } else if (signal === 'SELL') {
    direction = 'DOWN';
    targetPrice = support[0] || currentPrice * 0.98;
    reversalPoint = support[0] ? support[0] * 0.995 : currentPrice * 0.975;
    
    // 3 точки входа для ПРОДАЖИ
    const nearResistance = resistance[0] || currentPrice * 1.01;
    const midResistance = resistance[1] || currentPrice * 1.015;
    const farResistance = resistance[2] || currentPrice * 1.03;
    
    entryPoints = [
      {
        type: 'Агрессивный',
        entryPrice: currentPrice,
        probability: probability,
        stopLoss: nearResistance * 1.005,
        takeProfit: support[0] || currentPrice * 0.98,
        riskReward: (currentPrice - (support[0] || currentPrice * 0.98)) / (nearResistance * 1.005 - currentPrice),
        description: 'Вход по текущей цене - максимальный потенциал, но выше риск'
      },
      {
        type: 'Умеренный',
        entryPrice: nearResistance,
        probability: Math.min(100, probability + 10),
        stopLoss: midResistance * 1.005,
        takeProfit: support[0] || currentPrice * 0.98,
        riskReward: (nearResistance - (support[0] || currentPrice * 0.98)) / (midResistance * 1.005 - nearResistance),
        description: 'Вход от первого сопротивления - баланс риска и прибыли'
      },
      {
        type: 'Консервативный',
        entryPrice: midResistance,
        probability: Math.min(100, probability + 20),
        stopLoss: farResistance * 1.005,
        takeProfit: support[0] || currentPrice * 0.98,
        riskReward: (midResistance - (support[0] || currentPrice * 0.98)) / (farResistance * 1.005 - midResistance),
        description: 'Вход от второго сопротивления - минимальный риск, высокая вероятность'
      }
    ];
    
    if (indicators.rsi > 70 && liquiditySweep.isSweep) {
      reason = 'RSI перекуплен + сбор стопов - сильная коррекция';
    } else if (!cvdGrowing && priceGrowing) {
      reason = 'CVD падает при росте цены - маркет-мейкер разгружает';
    } else if (analysis.trend === 'bearish' && htfTrend === 'bearish') {
      reason = 'Нисходящий тренд на всех таймфреймах';
    } else {
      reason = 'Технические индикаторы указывают на снижение';
    }
  } else {
    direction = 'SIDEWAYS';
    targetPrice = currentPrice;
    reversalPoint = currentPrice;
    reason = 'Неопределенная ситуация - лучше ждать четкого сигнала';
    
    // Для HOLD не даем точки входа
    entryPoints = [];
  }

  return {
    signal,
    probability,
    factors: factors.slice(0, 8),
    entryPoints,
    prediction: {
      direction,
      targetPrice,
      reversalPoint,
      timeframe: '1-4 часа',
      reason
    }
  };
}

export function formatProbabilityReport(
  score: ProbabilityScore,
  currentPrice: number,
  support: number[],
  resistance: number[]
): string {
  let report = `**Сигнал:** ${score.signal}\n`;
  report += `**Общая вероятность:** ${score.probability}%\n\n`;
  
  // 3 точки входа
  if (score.entryPoints.length > 0) {
    report += `**📍 ТОЧКИ ВХОДА:**\n\n`;
    
    score.entryPoints.forEach((entry, idx) => {
      const emoji = entry.type === 'Агрессивный' ? '🔥' : entry.type === 'Умеренный' ? '⚖️' : '🛡️';
      report += `${emoji} **${entry.type}** (${entry.probability}%)\n`;
      report += `• Вход: $${entry.entryPrice.toFixed(2)}\n`;
      report += `• Стоп: $${entry.stopLoss.toFixed(2)}\n`;
      report += `• Цель: $${entry.takeProfit.toFixed(2)}\n`;
      report += `• Risk/Reward: 1:${entry.riskReward.toFixed(2)}\n`;
      report += `• ${entry.description}\n\n`;
    });
  }
  
  report += `**ПРОГНОЗ:**\n`;
  report += `• Направление: ${score.prediction.direction === 'UP' ? '📈 ВВЕРХ' : score.prediction.direction === 'DOWN' ? '📉 ВНИЗ' : '↔️ БОКОВИК'}\n`;
  report += `• Цель движения: ${score.prediction.targetPrice.toFixed(2)}\n`;
  report += `• Разворот ожидается: ${score.prediction.reversalPoint.toFixed(2)}\n`;
  report += `• Таймфрейм: ${score.prediction.timeframe}\n\n`;
  
  report += `**Факторы:**\n`;
  score.factors.forEach(factor => {
    report += `• ${factor}\n`;
  });
  
  report += `\n**Почему:** ${score.prediction.reason}`;

  return report;
}
