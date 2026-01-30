export interface PriceData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalIndicators {
  // Основные индикаторы (видимые)
  rsi: number;
  macd: { value: number; signal: number; histogram: number };
  sma20: number;
  sma50: number;
  sma200: number;
  ema12?: number;
  ema26?: number;
  ema50?: number;
  bollingerBands: { upper: number; middle: number; lower: number };
  
  // Дополнительные индикаторы (для AI анализа)
  atr?: number;
  adx?: { adx: number; plusDI: number; minusDI: number };
  stochasticRSI?: { k: number; d: number };
  superTrend?: { value: number; direction: 'BUY' | 'SELL'; trend: number[] };
  ichimoku?: {
    tenkan: number;
    kijun: number;
    senkouA: number;
    senkouB: number;
    chikou: number;
    signal: 'bullish' | 'bearish' | 'neutral';
  };
  obv?: number;
  obvDivergence?: { hasDivergence: boolean; type?: 'bullish' | 'bearish' };
  
  // Volume индикаторы
  volumeSMA?: number;
  cvd?: number;
}

export interface MarketStructure {
  type: 'HH' | 'HL' | 'LH' | 'LL' | 'RANGE';
  breakOfStructure: 'UP' | 'DOWN' | 'NONE';
  liquiditySweep?: boolean;
  sweepDirection?: 'UP' | 'DOWN';
}

export interface MarketAnalysis {
  trend: 'bullish' | 'bearish' | 'sideways';
  support: number[];
  resistance: number[];
  volatility: number;
  signal: 'buy' | 'sell' | 'hold';
  confidence: number;
  marketStructure?: MarketStructure;
  volumeProfile?: {
    isVolumeSpike: boolean;
    volumeRatio: number;
    priceVolumeAlignment: boolean;
  };
}

export interface RiskMetrics {
  positionSize: number;
  stopLoss: number;
  takeProfit: number;
  riskRewardRatio: number;
}
