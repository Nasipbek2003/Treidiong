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

// Блок 11: ATR (Average True Range) - для адаптивных стопов
export function calculateATR(data: PriceData[], period: number = 14): number {
  if (data.length < period + 1) return 0;
  
  const trueRanges: number[] = [];
  
  for (let i = 1; i < data.length; i++) {
    const high = data[i].high;
    const low = data[i].low;
    const prevClose = data[i - 1].close;
    
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    
    trueRanges.push(tr);
  }
  
  // Берем последние N значений
  const recentTR = trueRanges.slice(-period);
  return recentTR.reduce((sum, tr) => sum + tr, 0) / period;
}

// Рассчитывает адаптивный стоп на основе ATR
export function calculateAdaptiveStop(
  entryPrice: number,
  direction: 'BUY' | 'SELL',
  atr: number,
  multiplier: number = 1.5
): number {
  if (direction === 'BUY') {
    return entryPrice - (atr * multiplier);
  } else {
    return entryPrice + (atr * multiplier);
  }
}

// ADX (Average Directional Index) - сила тренда
export function calculateADX(data: PriceData[], period: number = 14): {
  adx: number;
  plusDI: number;
  minusDI: number;
} {
  if (data.length < period + 1) {
    return { adx: 0, plusDI: 0, minusDI: 0 };
  }

  const tr: number[] = [];
  const plusDM: number[] = [];
  const minusDM: number[] = [];

  for (let i = 1; i < data.length; i++) {
    const high = data[i].high;
    const low = data[i].low;
    const prevHigh = data[i - 1].high;
    const prevLow = data[i - 1].low;
    const prevClose = data[i - 1].close;

    // True Range
    const trValue = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    tr.push(trValue);

    // Directional Movement
    const upMove = high - prevHigh;
    const downMove = prevLow - low;

    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
  }

  // Smoothed averages
  const atr = calculateSMA(tr.slice(-period), period);
  const smoothedPlusDM = calculateSMA(plusDM.slice(-period), period);
  const smoothedMinusDM = calculateSMA(minusDM.slice(-period), period);

  const plusDI = (smoothedPlusDM / atr) * 100;
  const minusDI = (smoothedMinusDM / atr) * 100;

  const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100;
  const adx = calculateSMA([dx], period);

  return { adx, plusDI, minusDI };
}

// Stochastic RSI - точные входы на малых таймфреймах
export function calculateStochasticRSI(prices: number[], period: number = 14, smoothK: number = 3, smoothD: number = 3): {
  k: number;
  d: number;
} {
  if (prices.length < period + smoothK + smoothD) {
    return { k: 50, d: 50 };
  }

  const rsiValues: number[] = [];
  for (let i = period; i < prices.length; i++) {
    const slice = prices.slice(i - period, i + 1);
    rsiValues.push(calculateRSI(slice, period));
  }

  const recentRSI = rsiValues.slice(-period);
  const minRSI = Math.min(...recentRSI);
  const maxRSI = Math.max(...recentRSI);
  const currentRSI = recentRSI[recentRSI.length - 1];

  const stochRSI = maxRSI !== minRSI ? ((currentRSI - minRSI) / (maxRSI - minRSI)) * 100 : 50;

  // Сглаживание K и D
  const k = stochRSI;
  const d = k; // Упрощенная версия, можно добавить SMA для D

  return { k, d };
}

// SuperTrend - четкие сигналы BUY/SELL
export function calculateSuperTrend(data: PriceData[], period: number = 10, multiplier: number = 3): {
  value: number;
  direction: 'BUY' | 'SELL';
  trend: number[];
} {
  if (data.length < period) {
    return { value: 0, direction: 'SELL', trend: [] };
  }

  const atr = calculateATR(data, period);
  const trend: number[] = [];
  let direction: 'BUY' | 'SELL' = 'SELL';

  for (let i = 0; i < data.length; i++) {
    const hl2 = (data[i].high + data[i].low) / 2;
    const basicUpperBand = hl2 + multiplier * atr;
    const basicLowerBand = hl2 - multiplier * atr;

    if (data[i].close > basicUpperBand) {
      direction = 'BUY';
      trend.push(basicLowerBand);
    } else if (data[i].close < basicLowerBand) {
      direction = 'SELL';
      trend.push(basicUpperBand);
    } else {
      trend.push(i > 0 ? trend[i - 1] : hl2);
    }
  }

  return {
    value: trend[trend.length - 1],
    direction,
    trend
  };
}

// Ichimoku Cloud - комплексный анализ
export function calculateIchimoku(data: PriceData[]): {
  tenkan: number;
  kijun: number;
  senkouA: number;
  senkouB: number;
  chikou: number;
  signal: 'bullish' | 'bearish' | 'neutral';
} {
  if (data.length < 52) {
    return {
      tenkan: 0,
      kijun: 0,
      senkouA: 0,
      senkouB: 0,
      chikou: 0,
      signal: 'neutral'
    };
  }

  // Tenkan-sen (Conversion Line): (9-period high + 9-period low) / 2
  const tenkanPeriod = 9;
  const tenkanHigh = Math.max(...data.slice(-tenkanPeriod).map(d => d.high));
  const tenkanLow = Math.min(...data.slice(-tenkanPeriod).map(d => d.low));
  const tenkan = (tenkanHigh + tenkanLow) / 2;

  // Kijun-sen (Base Line): (26-period high + 26-period low) / 2
  const kijunPeriod = 26;
  const kijunHigh = Math.max(...data.slice(-kijunPeriod).map(d => d.high));
  const kijunLow = Math.min(...data.slice(-kijunPeriod).map(d => d.low));
  const kijun = (kijunHigh + kijunLow) / 2;

  // Senkou Span A: (Tenkan + Kijun) / 2, projected 26 periods ahead
  const senkouA = (tenkan + kijun) / 2;

  // Senkou Span B: (52-period high + 52-period low) / 2, projected 26 periods ahead
  const senkouBPeriod = 52;
  const senkouBHigh = Math.max(...data.slice(-senkouBPeriod).map(d => d.high));
  const senkouBLow = Math.min(...data.slice(-senkouBPeriod).map(d => d.low));
  const senkouB = (senkouBHigh + senkouBLow) / 2;

  // Chikou Span: Current close, projected 26 periods back
  const chikou = data[data.length - 1].close;

  // Определение сигнала
  const currentPrice = data[data.length - 1].close;
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';

  if (currentPrice > Math.max(senkouA, senkouB) && tenkan > kijun) {
    signal = 'bullish';
  } else if (currentPrice < Math.min(senkouA, senkouB) && tenkan < kijun) {
    signal = 'bearish';
  }

  return { tenkan, kijun, senkouA, senkouB, chikou, signal };
}

// OBV (On Balance Volume) - подтверждение движения объемом
export function calculateOBV(data: PriceData[]): number {
  if (data.length < 2) return 0;

  let obv = 0;
  for (let i = 1; i < data.length; i++) {
    if (data[i].close > data[i - 1].close) {
      obv += data[i].volume;
    } else if (data[i].close < data[i - 1].close) {
      obv -= data[i].volume;
    }
    // Если цена не изменилась, OBV остается прежним
  }

  return obv;
}

// Анализ дивергенции OBV с ценой
export function analyzeOBVDivergence(data: PriceData[]): {
  hasDivergence: boolean;
  type?: 'bullish' | 'bearish';
} {
  if (data.length < 20) return { hasDivergence: false };

  const obv = calculateOBV(data);
  const prevOBV = calculateOBV(data.slice(0, -10));
  
  const currentPrice = data[data.length - 1].close;
  const prevPrice = data[data.length - 11].close;

  // Бычья дивергенция: цена падает, OBV растет
  if (currentPrice < prevPrice && obv > prevOBV) {
    return { hasDivergence: true, type: 'bullish' };
  }

  // Медвежья дивергенция: цена растет, OBV падает
  if (currentPrice > prevPrice && obv < prevOBV) {
    return { hasDivergence: true, type: 'bearish' };
  }

  return { hasDivergence: false };
}
