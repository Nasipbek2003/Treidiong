import { PriceData, MarketAnalysis, TechnicalIndicators } from '@/types';
import { 
  calculateSMA, 
  calculateRSI, 
  calculateVolatility,
  calculateVolumeSMA,
  calculateCVD,
  detectLiquiditySweep,
  analyzeMarketStructure
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
  
  if (indicators.rsi < 30) score += 2;
  else if (indicators.rsi > 70) score -= 2;
  
  if (indicators.macd.histogram > 0) score += 1;
  else score -= 1;
  
  if (trend === 'bullish') score += 2;
  else if (trend === 'bearish') score -= 2;
  
  const confidence = Math.min(Math.abs(score) * 15, 100);
  
  if (score >= 3) return { signal: 'buy', confidence };
  if (score <= -3) return { signal: 'sell', confidence };
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
