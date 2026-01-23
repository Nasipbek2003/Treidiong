export interface PriceData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalIndicators {
  rsi: number;
  macd: { value: number; signal: number; histogram: number };
  sma20: number;
  sma50: number;
  sma200: number;
  bollingerBands: { upper: number; middle: number; lower: number };
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
