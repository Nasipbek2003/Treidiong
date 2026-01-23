import { PriceData, TechnicalIndicators } from '@/types';

export function calculateSMA(data: number[], period: number): number {
  if (data.length < period) return 0;
  const slice = data.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

export function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;
  
  let gains = 0, losses = 0;
  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  const rs = avgGain / (avgLoss || 1);
  return 100 - (100 / (1 + rs));
}

export function calculateMACD(prices: number[]): { value: number; signal: number; histogram: number } {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macdLine = ema12 - ema26;
  const signalLine = calculateEMA([macdLine], 9);
  
  return {
    value: macdLine,
    signal: signalLine,
    histogram: macdLine - signalLine
  };
}

export function calculateEMA(prices: number[], period: number): number {
  if (prices.length === 0) return 0;
  const multiplier = 2 / (period + 1);
  let ema = prices[0];
  
  for (let i = 1; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }
  return ema;
}

export function calculateBollingerBands(prices: number[], period: number = 20): { upper: number; middle: number; lower: number } {
  const sma = calculateSMA(prices, period);
  const slice = prices.slice(-period);
  const variance = slice.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
  const stdDev = Math.sqrt(variance);
  
  return {
    upper: sma + (stdDev * 2),
    middle: sma,
    lower: sma - (stdDev * 2)
  };
}

export function calculateVolatility(prices: number[]): number {
  if (prices.length < 2) return 0;
  const returns = prices.slice(1).map((price, i) => Math.log(price / prices[i]));
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
  return Math.sqrt(variance) * Math.sqrt(252) * 100;
}

// Блок 7: Volume & Money Flow
export function calculateVolumeSMA(volumes: number[], period: number = 20): number {
  if (volumes.length < period) return 0;
  const slice = volumes.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

export function isVolumeSpike(currentVolume: number, volumeSMA: number): boolean {
  return currentVolume > volumeSMA * 1.5;
}

export function calculateCVD(data: PriceData[]): number {
  let cvd = 0;
  for (let i = 1; i < data.length; i++) {
    const priceChange = data[i].close - data[i - 1].close;
    const volumeDelta = priceChange > 0 ? data[i].volume : -data[i].volume;
    cvd += volumeDelta;
  }
  return cvd;
}

export function analyzePriceVolumeAlignment(
  prices: number[],
  volumes: number[],
  period: number = 5
): boolean {
  if (prices.length < period || volumes.length < period) return false;
  
  const recentPrices = prices.slice(-period);
  const recentVolumes = volumes.slice(-period);
  
  const priceUp = recentPrices[recentPrices.length - 1] > recentPrices[0];
  const volumeUp = recentVolumes[recentVolumes.length - 1] > recentVolumes[0];
  
  return priceUp === volumeUp;
}

// Блок 8: Liquidity & Stop Hunts
export function detectLiquiditySweep(data: PriceData[]): { 
  isSweep: boolean; 
  direction?: 'UP' | 'DOWN' 
} {
  if (data.length < 10) return { isSweep: false };
  
  const recent = data.slice(-10);
  const lastCandle = recent[recent.length - 1];
  const prevHigh = Math.max(...recent.slice(0, -1).map(d => d.high));
  const prevLow = Math.min(...recent.slice(0, -1).map(d => d.low));
  
  // Пробой вверх с возвратом
  if (lastCandle.high > prevHigh && lastCandle.close < prevHigh) {
    return { isSweep: true, direction: 'UP' };
  }
  
  // Пробой вниз с возвратом
  if (lastCandle.low < prevLow && lastCandle.close > prevLow) {
    return { isSweep: true, direction: 'DOWN' };
  }
  
  return { isSweep: false };
}

// Блок 9: Market Structure
export function analyzeMarketStructure(data: PriceData[]): {
  type: 'HH' | 'HL' | 'LH' | 'LL' | 'RANGE';
  breakOfStructure: 'UP' | 'DOWN' | 'NONE';
} {
  if (data.length < 20) return { type: 'RANGE', breakOfStructure: 'NONE' };
  
  const highs: number[] = [];
  const lows: number[] = [];
  
  // Находим локальные максимумы и минимумы
  for (let i = 2; i < data.length - 2; i++) {
    if (data[i].high > data[i-1].high && data[i].high > data[i-2].high &&
        data[i].high > data[i+1].high && data[i].high > data[i+2].high) {
      highs.push(data[i].high);
    }
    if (data[i].low < data[i-1].low && data[i].low < data[i-2].low &&
        data[i].low < data[i+1].low && data[i].low < data[i+2].low) {
      lows.push(data[i].low);
    }
  }
  
  if (highs.length < 2 || lows.length < 2) {
    return { type: 'RANGE', breakOfStructure: 'NONE' };
  }
  
  const lastHigh = highs[highs.length - 1];
  const prevHigh = highs[highs.length - 2];
  const lastLow = lows[lows.length - 1];
  const prevLow = lows[lows.length - 2];
  
  const currentPrice = data[data.length - 1].close;
  
  // Определяем структуру
  let type: 'HH' | 'HL' | 'LH' | 'LL' | 'RANGE';
  let breakOfStructure: 'UP' | 'DOWN' | 'NONE' = 'NONE';
  
  if (lastHigh > prevHigh && lastLow > prevLow) {
    type = 'HH';
    if (currentPrice > lastHigh) breakOfStructure = 'UP';
  } else if (lastHigh > prevHigh && lastLow < prevLow) {
    type = 'HL';
  } else if (lastHigh < prevHigh && lastLow > prevLow) {
    type = 'LH';
  } else if (lastHigh < prevHigh && lastLow < prevLow) {
    type = 'LL';
    if (currentPrice < lastLow) breakOfStructure = 'DOWN';
  } else {
    type = 'RANGE';
  }
  
  return { type, breakOfStructure };
}

// Блок 10: Multi-Timeframe
export function getHigherTimeframeTrend(
  data: PriceData[],
  multiplier: number = 12
): 'bullish' | 'bearish' | 'sideways' {
  if (data.length < 50 * multiplier) return 'sideways';
  
  // Берем каждую N-ю свечу для симуляции старшего таймфрейма
  const htfData: number[] = [];
  for (let i = 0; i < data.length; i += multiplier) {
    htfData.push(data[i].close);
  }
  
  const sma20 = calculateSMA(htfData, 20);
  const sma50 = calculateSMA(htfData, 50);
  const currentPrice = htfData[htfData.length - 1];
  
  if (currentPrice > sma20 && sma20 > sma50) return 'bullish';
  if (currentPrice < sma20 && sma20 < sma50) return 'bearish';
  return 'sideways';
}
