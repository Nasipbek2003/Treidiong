import { PriceData, MarketAnalysis, TechnicalIndicators } from '@/types';
import { 
  calculateSMA, 
  calculateRSI, 
  calculateVolatility,
  calculateVolumeSMA,
  calculateCVD,
  detectLiquiditySweep,
  analyzeMarketStructure,
  calculateEMA,
  calculateATR,
  calculateADX,
  calculateStochasticRSI,
  calculateSuperTrend,
  calculateIchimoku,
  calculateOBV,
  analyzeOBVDivergence
} from './indicators';

export function analyzeTrend(prices: number[]): 'bullish' | 'bearish' | 'sideways' {
  const sma20 = calculateSMA(prices, 20);
  const sma50 = calculateSMA(prices, 50);
  const currentPrice = prices[prices.length - 1];
  
  if (currentPrice > sma20 && sma20 > sma50) return 'bullish';
  if (currentPrice < sma20 && sma20 < sma50) return 'bearish';
  return 'sideways';
}

export function findSupportResistance(data: PriceData[]): { support: number[]; resistance: number[] } {
  const highs = data.map(d => d.high);
  const lows = data.map(d => d.low);
  
  const resistance = findPeaks(highs).slice(0, 3);
  const support = findPeaks(lows.map(l => -l)).map(s => -s).slice(0, 3);
  
  return { support, resistance };
}

function findPeaks(data: number[]): number[] {
  const peaks: number[] = [];
  for (let i = 2; i < data.length - 2; i++) {
    if (data[i] > data[i-1] && data[i] > data[i-2] && 
        data[i] > data[i+1] && data[i] > data[i+2]) {
      peaks.push(data[i]);
    }
  }
  return peaks.sort((a, b) => b - a);
}

export function generateSignal(indicators: TechnicalIndicators, trend: string): { signal: 'buy' | 'sell' | 'hold'; confidence: number } {
  let score = 0;
  
  // RSI
  if (indicators.rsi < 30) score += 2;
  else if (indicators.rsi > 70) score -= 2;
  
  // MACD
  if (indicators.macd.histogram > 0) score += 1;
  else score -= 1;
  
  // Trend
  if (trend === 'bullish') score += 2;
  else if (trend === 'bearish') score -= 2;
  
  // ADX - сила тренда
  if (indicators.adx && indicators.adx.adx > 25) {
    if (indicators.adx.plusDI > indicators.adx.minusDI) score += 1;
    else score -= 1;
  }
  
  // Stochastic RSI
  if (indicators.stochasticRSI) {
    if (indicators.stochasticRSI.k < 20) score += 1;
    else if (indicators.stochasticRSI.k > 80) score -= 1;
  }
  
  // SuperTrend
  if (indicators.superTrend) {
    if (indicators.superTrend.direction === 'BUY') score += 2;
    else score -= 2;
  }
  
  // Ichimoku
  if (indicators.ichimoku) {
    if (indicators.ichimoku.signal === 'bullish') score += 1;
    else if (indicators.ichimoku.signal === 'bearish') score -= 1;
  }
  
  // OBV Divergence
  if (indicators.obvDivergence?.hasDivergence) {
    if (indicators.obvDivergence.type === 'bullish') score += 1;
    else if (indicators.obvDivergence.type === 'bearish') score -= 1;
  }
  
  const confidence = Math.min(Math.abs(score) * 10, 100);
  
  if (score >= 4) return { signal: 'buy', confidence };
  if (score <= -4) return { signal: 'sell', confidence };
  return { signal: 'hold', confidence };
}

export function performFullAnalysis(data: PriceData[], indicators: TechnicalIndicators): MarketAnalysis {
  const prices = data.map(d => d.close);
  const volumes = data.map(d => d.volume);
  const trend = analyzeTrend(prices);
  const { support, resistance } = findSupportResistance(data);
  const volatility = calculateVolatility(prices);
  const { signal, confidence } = generateSignal(indicators, trend);
  
  // Новые критерии
  const volumeSMA = calculateVolumeSMA(volumes);
  const currentVolume = volumes[volumes.length - 1];
  const isVolumeSpike = currentVolume > volumeSMA * 1.5;
  const priceVolumeAlignment = prices[prices.length - 1] > prices[prices.length - 2] === 
                                currentVolume > volumes[volumes.length - 2];
  
  const liquiditySweep = detectLiquiditySweep(data);
  const structureAnalysis = analyzeMarketStructure(data);
  
  return { 
    trend, 
    support, 
    resistance, 
    volatility, 
    signal, 
    confidence,
    marketStructure: {
      ...structureAnalysis,
      liquiditySweep: liquiditySweep.isSweep,
      sweepDirection: liquiditySweep.direction
    },
    volumeProfile: {
      isVolumeSpike,
      volumeRatio: currentVolume / volumeSMA,
      priceVolumeAlignment
    }
  };
}
