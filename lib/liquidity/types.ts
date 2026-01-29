/**
 * Liquidity Engine - Type Definitions
 * 
 * This file contains all TypeScript interfaces and types used throughout
 * the Liquidity Engine system for analyzing liquidity zones, detecting
 * liquidity sweeps, and generating trading signals.
 */

/**
 * Candlestick data structure representing OHLCV data for a single time period
 */
export interface Candlestick {
  /** Unix timestamp in milliseconds */
  timestamp: number;
  /** Opening price */
  open: number;
  /** Highest price during the period */
  high: number;
  /** Lowest price during the period */
  low: number;
  /** Closing price */
  close: number;
  /** Trading volume */
  volume: number;
}

/**
 * Type of liquidity pool based on market structure
 */
export type LiquidityPoolType =
  | 'equal_highs'
  | 'equal_lows'
  | 'pdh'
  | 'pdl'
  | 'asian_high'
  | 'asian_low'
  | 'range_high'
  | 'range_low'
  | 'trendline_high'
  | 'trendline_low'
  | 'triangle_upper'
  | 'triangle_lower';

/**
 * Status of a liquidity pool
 */
export type LiquidityPoolStatus = 'active' | 'swept';

/**
 * Liquidity Pool - represents a zone of concentrated stop-losses
 */
export interface LiquidityPool {
  /** Unique identifier */
  id: string;
  /** Type of liquidity pool */
  type: LiquidityPoolType;
  /** Price level of the pool */
  price: number;
  /** Unix timestamp when pool was identified */
  timestamp: number;
  /** Current status of the pool */
  status: LiquidityPoolStatus;
  /** Indices of candles that form this pool */
  candleIndices: number[];
  /** Strength/significance of the pool (number of touches or importance) */
  strength: number;
}

/**
 * Direction of liquidity sweep or structure change
 */
export type Direction = 'up' | 'down';

/**
 * Liquidity Sweep - represents a stop hunt event
 */
export interface LiquiditySweep {
  /** Unique identifier */
  id: string;
  /** ID of the swept liquidity pool */
  poolId: string;
  /** Type of the swept pool */
  poolType: string;
  /** Price at which sweep occurred */
  sweepPrice: number;
  /** Unix timestamp of the sweep */
  sweepTimestamp: number;
  /** Index of the candle that performed the sweep */
  candleIndex: number;
  /** Size of the wick as percentage (0-1) */
  wickSize: number;
  /** Direction of the sweep */
  direction: Direction;
  /** Strength of rejection after sweep (0-1) */
  rejectionStrength: number;
}

/**
 * Type of structure change
 */
export type StructureChangeType = 'CHOCH' | 'BOS';

/**
 * Market trend direction
 */
export type TrendType = 'uptrend' | 'downtrend' | 'range';

/**
 * Structure Change - represents CHOCH or BOS events
 */
export interface StructureChange {
  /** Unique identifier */
  id: string;
  /** Type of structure change */
  type: StructureChangeType;
  /** Direction of the change */
  direction: Direction;
  /** Price at which structure changed */
  price: number;
  /** Unix timestamp of the change */
  timestamp: number;
  /** Index of the candle where change occurred */
  candleIndex: number;
  /** Previous market structure before change */
  previousStructure: TrendType;
  /** Significance of the change (0-1) */
  significance: number;
}

/**
 * Breakdown of signal score components
 */
export interface SignalScoreBreakdown {
  /** Score from liquidity sweep (0-25) */
  sweepScore: number;
  /** Score from break of structure (0-30) */
  bosScore: number;
  /** Score from RSI divergence (0-15) */
  divergenceScore: number;
  /** Score from volume spike (0-10) */
  volumeScore: number;
  /** Score from higher timeframe level (0-20) */
  htfScore: number;
  /** Score from triangle pattern (0-15) */
  triangleScore?: number;
  /** Score from trading session (0-5) */
  sessionScore?: number;
}

/**
 * Signal Score - evaluation of trading signal strength
 */
export interface SignalScore {
  /** Total score normalized to 0-100 */
  totalScore: number;
  /** Breakdown of score components */
  breakdown: SignalScoreBreakdown;
  /** Descriptions of contributing components */
  components: string[];
}

/**
 * Trading signal direction
 */
export type SignalDirection = 'BUY' | 'SELL';

/**
 * Trading Signal - complete trading signal with all metadata
 */
export interface TradingSignal {
  /** Unique identifier */
  id: string;
  /** Trading symbol (e.g., 'BTCUSDT') */
  symbol: string;
  /** Signal direction */
  direction: SignalDirection;
  /** Signal strength score */
  score: SignalScore;
  /** Unix timestamp when signal was generated */
  timestamp: number;
  /** ID of associated liquidity sweep (optional) */
  sweepId?: string;
  /** ID of associated structure change (optional) */
  structureChangeId?: string;
  /** Suggested entry price */
  entryPrice: number;
  /** Suggested stop loss price */
  stopLoss: number;
  /** Suggested take profit price */
  takeProfit: number;
  /** Human-readable reasoning for the signal */
  reasoning: string;
}

/**
 * Score weights configuration
 */
export interface ScoreWeights {
  /** Weight for sweep component (default: 25) */
  sweep: number;
  /** Weight for BOS component (default: 30) */
  bos: number;
  /** Weight for divergence component (default: 15) */
  divergence: number;
  /** Weight for volume component (default: 10) */
  volume: number;
  /** Weight for HTF component (default: 20) */
  htf: number;
  /** Weight for triangle component (default: 15) */
  triangle?: number;
  /** Weight for session component (default: 5) */
  session?: number;
}

/**
 * Liquidity Engine Configuration
 */
export interface LiquidityConfig {
  /** Tolerance for Equal Highs/Lows as percentage (default: 0.001 = 0.1%) */
  equalTolerance: number;
  /** Minimum wick size for sweep as percentage (default: 0.5 = 50%) */
  minWickSize: number;
  /** Multiplier for volume spike detection (default: 1.5) */
  volumeSpikeMultiplier: number;
  /** Weights for scoring components */
  scoreWeights: ScoreWeights;
  /** Timeframes for HTF analysis (default: ['1d', '1w']) */
  htfTimeframes: readonly string[];
  /** Minimum number of touches for Range High/Low (default: 3) */
  minRangeTouches: number;
  /** Lookback period for swing points (default: 20) */
  swingLookback: number;
}

/**
 * Swing Point - represents a local high or low in price action
 */
export interface SwingPoint {
  /** Type of swing point */
  type: 'high' | 'low';
  /** Price at the swing point */
  price: number;
  /** Index of the candle forming the swing point */
  candleIndex: number;
}

/**
 * Breakout Validation Result
 */
export interface BreakoutValidation {
  /** Whether the breakout is valid */
  isValid: boolean;
  /** Reasons for invalidity (empty if valid) */
  reasons: string[];
  /** Volume check passed */
  volumeCheck: boolean;
  /** Close check passed */
  closeCheck: boolean;
  /** Wick check passed */
  wickCheck: boolean;
  /** Divergence check passed */
  divergenceCheck: boolean;
}

/**
 * Validation Result for input data
 */
export interface ValidationResult {
  /** Whether the data is valid */
  isValid: boolean;
  /** List of validation errors */
  errors: string[];
}
