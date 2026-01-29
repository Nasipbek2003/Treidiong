# Liquidity Engine

A comprehensive system for analyzing liquidity zones, detecting liquidity sweeps, and generating trading signals based on Smart Money Concepts (SMC).

## Overview

The Liquidity Engine is designed to:
- Identify liquidity pools (zones where stop-losses are concentrated)
- Detect liquidity sweeps (stop hunts by institutional traders)
- Filter false breakouts
- Analyze market structure changes (CHOCH/BOS)
- Generate high-probability trading signals

## Architecture

The system consists of the following components:

1. **LiquidityPoolDetector** - Identifies liquidity zones (Equal Highs/Lows, PDH/PDL, Asian Range, etc.)
2. **SweepDetector** - Detects liquidity sweep events
3. **BreakoutValidator** - Filters false breakouts using volume, RSI, and price action
4. **StructureAnalyzer** - Identifies market structure changes (CHOCH/BOS)
5. **SignalScorer** - Evaluates signal strength (0-100 score)
6. **TriangleDetector** - Detects triangle patterns and generates entry signals (NEW)
7. **LiquidityStore** - Manages state and persistence
8. **LiquidityAPI** - REST API for integration

## New Feature: Triangle Pattern Detection

The system now includes advanced triangle pattern detection with strict entry rules:

### Key Features:
- ✅ Automatic triangle detection (converging trendlines)
- ✅ Two trading methods: Breakout+Retest (85% confidence) and False Breakout (75% confidence)
- ✅ Strict validation: 3 mandatory checks before entry
- ✅ Risk management: Auto-calculated stop loss and take profit
- ✅ Integration with existing liquidity analysis

### Quick Start:

```typescript
import { TriangleDetector } from './triangle-detector';

const detector = new TriangleDetector();
const triangles = detector.detectTriangles(candles);

// Check for breakout + retest
const breakout = detector.detectBreakout(candles, triangle, currentIndex);
const retest = detector.detectRetest(candles, triangle, breakout, currentIndex);

// Generate signal
const signal = detector.generateSignal(candles, triangle, 'breakout-retest', breakout, retest);

// Validate
const validation = detector.validateSignal(candles, signal, currentIndex);
```

### Documentation:
- **Full Guide**: `TRIANGLE_TRADING.md` - Complete trading rules for AI
- **Quick Start**: `TRIANGLE_QUICKSTART.md` - Get started in 5 minutes
- **Integration**: `TRIANGLE_INTEGRATION.md` - How to integrate into existing system
- **Examples**: `triangle-example.ts` - Code examples
- **Tests**: `../scripts/test-triangle-detector.js` - Test suite

## Installation

Dependencies are already installed. The system uses:
- **Jest** - Testing framework
- **ts-jest** - TypeScript support for Jest
- **fast-check** - Property-based testing library

## Testing

Run tests with:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Type Definitions

All TypeScript interfaces are defined in `types.ts`:

- `Candlestick` - OHLCV data structure
- `LiquidityPool` - Liquidity zone definition
- `LiquiditySweep` - Stop hunt event
- `StructureChange` - CHOCH/BOS event
- `SignalScore` - Signal strength evaluation
- `TradingSignal` - Complete trading signal
- `LiquidityConfig` - System configuration

## Configuration

Default configuration values:

```typescript
{
  equalTolerance: 0.001,        // 0.1% tolerance for Equal Highs/Lows
  minWickSize: 0.5,             // 50% minimum wick size for sweeps
  volumeSpikeMultiplier: 1.5,   // 1.5x average volume for valid breakouts
  scoreWeights: {
    sweep: 25,                  // Points for liquidity sweep
    bos: 30,                    // Points for break of structure
    divergence: 15,             // Points for RSI divergence
    volume: 10,                 // Points for volume spike
    htf: 20                     // Points for HTF level
  },
  htfTimeframes: ['1d', '1w'],  // Higher timeframes for analysis
  minRangeTouches: 3,           // Minimum touches for range detection
  swingLookback: 20             // Lookback period for swing points
}
```

## Development Status

### ✅ Completed
- [x] Infrastructure setup
- [x] Type definitions
- [x] Jest configuration
- [x] fast-check installation
- [x] Basic type tests

### 🚧 In Progress
- [ ] LiquidityPoolDetector implementation
- [ ] SweepDetector implementation
- [ ] BreakoutValidator implementation
- [ ] StructureAnalyzer implementation
- [ ] SignalScorer implementation
- [ ] LiquidityStore implementation
- [ ] LiquidityEngine coordinator
- [ ] API endpoints
- [ ] Visualization components

## Testing Strategy

The system uses a dual testing approach:

1. **Unit Tests** - Specific examples and edge cases
2. **Property-Based Tests** - Universal properties validated across 100+ random inputs

All 29 correctness properties from the design document will be implemented as property-based tests using fast-check.

## Requirements Traceability

This implementation satisfies:
- **Requirement 8.1** - Data storage and access
- **Requirements 10.1-10.5** - Configuration and parameters

## License

Internal use only.
