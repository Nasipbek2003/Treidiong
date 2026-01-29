# Интеграция Детектора Треугольников

## Быстрый Старт

### 1. Импорт

```typescript
import { TriangleDetector } from './lib/liquidity/triangle-detector';
import type { Triangle, TriangleSignal } from './lib/liquidity/triangle-detector';
```

### 2. Базовое Использование

```typescript
const detector = new TriangleDetector();

// Детекция треугольников
const triangles = detector.detectTriangles(candles);

// Проверка пробоя
const breakout = detector.detectBreakout(candles, triangle, currentIndex);

// Проверка ретеста
const retest = detector.detectRetest(candles, triangle, breakout, currentIndex);

// Генерация сигнала
const signal = detector.generateSignal(
  candles,
  triangle,
  'breakout-retest',
  breakout,
  retest
);

// Валидация
const validation = detector.validateSignal(candles, signal, currentIndex);
```

## Интеграция в LiquidityEngine

### Шаг 1: Добавить детектор в конструктор

```typescript
// lib/liquidity/engine.ts

import { TriangleDetector } from './triangle-detector';

export class LiquidityEngine {
  private triangleDetector: TriangleDetector;
  
  constructor(config: LiquidityConfig) {
    // ... существующий код
    this.triangleDetector = new TriangleDetector();
  }
}
```

### Шаг 2: Добавить в метод analyze()

```typescript
async analyze(
  symbol: string,
  candles: Candlestick[],
  rsiData?: number[]
): Promise<AnalysisResult> {
  // ... существующий код
  
  // 6. Детекция треугольников
  const triangles = this.triangleDetector.detectTriangles(candles);
  const triangleSignals: TradingSignal[] = [];
  
  for (const triangle of triangles) {
    const currentIndex = candles.length - 1;
    
    // Проверка пробоя + ретест
    const breakout = this.triangleDetector.detectBreakout(
      candles,
      triangle,
      currentIndex
    );
    
    if (breakout) {
      // Ищем ретест в следующих 10 свечах
      for (let i = breakout.breakoutIndex + 1; 
           i < Math.min(candles.length, breakout.breakoutIndex + 11); 
           i++) {
        const retest = this.triangleDetector.detectRetest(
          candles,
          triangle,
          breakout,
          i
        );
        
        if (retest) {
          const signal = this.triangleDetector.generateSignal(
            candles,
            triangle,
            'breakout-retest',
            breakout,
            retest
          );
          
          if (signal) {
            const validation = this.triangleDetector.validateSignal(
              candles,
              signal,
              i
            );
            
            if (validation.isValid) {
              // Конвертируем в TradingSignal
              const tradingSignal = this.convertTriangleSignal(
                symbol,
                signal,
                candles[i]
              );
              triangleSignals.push(tradingSignal);
            }
          }
          
          break;
        }
      }
    }
    
    // Проверка ложного пробоя
    const falseBreakout = this.triangleDetector.detectFalseBreakout(
      candles,
      triangle,
      currentIndex
    );
    
    if (falseBreakout) {
      const signal = this.triangleDetector.generateSignal(
        candles,
        triangle,
        'false-breakout',
        undefined,
        undefined,
        falseBreakout
      );
      
      if (signal) {
        const validation = this.triangleDetector.validateSignal(
          candles,
          signal,
          currentIndex
        );
        
        if (validation.isValid) {
          const tradingSignal = this.convertTriangleSignal(
            symbol,
            signal,
            candles[currentIndex]
          );
          triangleSignals.push(tradingSignal);
        }
      }
    }
  }
  
  // Добавляем треугольные сигналы к результатам
  return {
    // ... существующие поля
    triangles,
    triangleSignals,
  };
}
```

### Шаг 3: Конвертация в TradingSignal

```typescript
private convertTriangleSignal(
  symbol: string,
  triangleSignal: TriangleSignal,
  candle: Candlestick
): TradingSignal {
  // Рассчитываем score для треугольника
  const triangleScore = this.calculateTriangleScore(triangleSignal);
  
  return {
    id: triangleSignal.id,
    symbol,
    direction: triangleSignal.direction,
    score: {
      totalScore: triangleScore,
      breakdown: {
        sweepScore: 0,
        bosScore: 0,
        divergenceScore: 0,
        volumeScore: 0,
        htfScore: 0,
        triangleScore, // НОВОЕ
      },
      components: [`Triangle ${triangleSignal.type}`],
    },
    timestamp: candle.timestamp,
    sweepId: undefined,
    structureChangeId: undefined,
    entryPrice: triangleSignal.entryPrice,
    stopLoss: triangleSignal.stopLoss,
    takeProfit: triangleSignal.takeProfit,
    reasoning: triangleSignal.reasoning,
  };
}

private calculateTriangleScore(signal: TriangleSignal): number {
  let score = 0;
  
  // Качество треугольника (0-10)
  score += signal.triangle.compressionRatio * 10;
  
  // Тип сигнала (0-10)
  if (signal.type === 'breakout-retest') {
    score += 10;
  } else if (signal.type === 'false-breakout') {
    score += 7;
  }
  
  // Confidence (0-5)
  score += signal.confidence * 5;
  
  return Math.min(score, 20);
}
```

## Обновление Types

### lib/liquidity/types.ts

```typescript
// Добавить в SignalScoreBreakdown
export interface SignalScoreBreakdown {
  sweepScore: number;
  bosScore: number;
  divergenceScore: number;
  volumeScore: number;
  htfScore: number;
  triangleScore?: number; // НОВОЕ
}

// Добавить в AnalysisResult (engine.ts)
export interface AnalysisResult {
  pools: LiquidityPool[];
  sweeps: LiquiditySweep[];
  structures: StructureChange[];
  signal: TradingSignal | null;
  hasValidSetup: boolean;
  blockingReasons: string[];
  triangles?: Triangle[]; // НОВОЕ
  triangleSignals?: TradingSignal[]; // НОВОЕ
}
```

## Обновление SignalScorer

### lib/liquidity/signal-scorer.ts

```typescript
export interface ScoreWeights {
  sweep: number;
  bos: number;
  divergence: number;
  volume: number;
  htf: number;
  triangle?: number; // НОВОЕ (по умолчанию 20)
}

// В конструкторе
constructor(weights?: Partial<ScoreWeights>) {
  this.weights = {
    sweep: weights?.sweep ?? 20,      // Уменьшено с 25
    bos: weights?.bos ?? 25,          // Уменьшено с 30
    divergence: weights?.divergence ?? 15,
    volume: weights?.volume ?? 10,
    htf: weights?.htf ?? 10,          // Уменьшено с 20
    triangle: weights?.triangle ?? 20, // НОВОЕ
  };
}
```

## Интеграция в SignalMonitor

### lib/signals/signal-monitor.ts

```typescript
private async performTier1Analysis(marketData: MarketData): Promise<Tier1Analysis> {
  const result = await this.engine.analyze(
    marketData.symbol,
    marketData.candles,
    marketData.rsiData
  );
  
  // Приоритет треугольным сигналам если они есть
  let bestSignal = result.signal;
  let bestScore = result.signal?.score.totalScore || 0;
  
  if (result.triangleSignals && result.triangleSignals.length > 0) {
    for (const triangleSignal of result.triangleSignals) {
      if (triangleSignal.score.totalScore > bestScore) {
        bestSignal = triangleSignal;
        bestScore = triangleSignal.score.totalScore;
      }
    }
  }
  
  return {
    signal: bestSignal,
    score: bestSignal?.score || { /* ... */ },
    hasValidSetup: result.hasValidSetup || (result.triangleSignals?.length || 0) > 0,
    blockingReasons: result.blockingReasons,
  };
}
```

## AI Prompt для Треугольников

### Обновление Tier 2 Analysis

```typescript
private async performTier2Analysis(
  tier1: Tier1Analysis,
  marketData: MarketData
): Promise<Tier2Analysis> {
  const signal = tier1.signal;
  if (!signal) {
    return { confirmed: false, explanation: 'Нет сигнала для анализа' };
  }
  
  // Проверяем, является ли это треугольным сигналом
  const isTriangleSignal = signal.score.breakdown.triangleScore !== undefined;
  
  let prompt = `Проанализируй торговый сигнал:

Символ: ${marketData.symbol}
Направление: ${signal.direction}
Score: ${tier1.score.totalScore.toFixed(1)}/100

Детали:
${signal.reasoning}

Breakdown:`;

  if (isTriangleSignal) {
    prompt += `
- Triangle Pattern: ${tier1.score.breakdown.triangleScore?.toFixed(1)}/${this.weights.triangle}`;
  } else {
    prompt += `
- Liquidity Sweep: ${tier1.score.breakdown.sweepScore.toFixed(1)}
- Structure Change: ${tier1.score.breakdown.bosScore.toFixed(1)}
- RSI Divergence: ${tier1.score.breakdown.divergenceScore.toFixed(1)}
- Volume: ${tier1.score.breakdown.volumeScore.toFixed(1)}
- HTF Level: ${tier1.score.breakdown.htfScore.toFixed(1)}`;
  }
  
  prompt += `

Подтверди сигнал и дай краткое объяснение на русском (2-3 предложения).`;
  
  // ... остальной код
}
```

## Тестирование

### Запуск тестов

```bash
# Тест детектора треугольников
node scripts/test-triangle-detector.js

# Полный тест системы с треугольниками
node scripts/test-full-system.js
```

### Примеры использования

```typescript
// Пример 1: Базовая детекция
import { exampleBasicDetection } from './lib/liquidity/triangle-example';
const triangles = exampleBasicDetection(candles);

// Пример 2: Пробой + ретест
import { exampleBreakoutRetest } from './lib/liquidity/triangle-example';
const signal = exampleBreakoutRetest(candles);

// Пример 3: Ложный пробой
import { exampleFalseBreakout } from './lib/liquidity/triangle-example';
const signal = exampleFalseBreakout(candles);

// Пример 4: Полный анализ
import { exampleFullAnalysis } from './lib/liquidity/triangle-example';
const { triangles, signals } = exampleFullAnalysis(candles);
```

## Визуализация (опционально)

### Добавление в компонент CandlestickChartWithLiquidity

```typescript
// Отрисовка треугольников
{triangles.map(triangle => (
  <g key={triangle.id}>
    {/* Верхняя линия */}
    <line
      x1={xScale(triangle.startIndex)}
      y1={yScale(triangle.upperLine.slope * triangle.startIndex + triangle.upperLine.intercept)}
      x2={xScale(triangle.endIndex)}
      y2={yScale(triangle.upperLine.slope * triangle.endIndex + triangle.upperLine.intercept)}
      stroke="blue"
      strokeWidth={2}
      strokeDasharray="5,5"
    />
    
    {/* Нижняя линия */}
    <line
      x1={xScale(triangle.startIndex)}
      y1={yScale(triangle.lowerLine.slope * triangle.startIndex + triangle.lowerLine.intercept)}
      x2={xScale(triangle.endIndex)}
      y2={yScale(triangle.lowerLine.slope * triangle.endIndex + triangle.lowerLine.intercept)}
      stroke="blue"
      strokeWidth={2}
      strokeDasharray="5,5"
    />
  </g>
))}
```

## Документация

- **Правила торговли**: `lib/liquidity/TRIANGLE_TRADING.md`
- **Примеры использования**: `lib/liquidity/triangle-example.ts`
- **AI анализ**: `lib/signals/AI_ANALYSIS.md` (раздел "Торговля Треугольниками")
- **Исходный документ**: `Троигольник`

## Чек-Лист Интеграции

- [ ] Добавить TriangleDetector в LiquidityEngine
- [ ] Обновить метод analyze()
- [ ] Добавить triangleScore в SignalScoreBreakdown
- [ ] Обновить ScoreWeights
- [ ] Интегрировать в SignalMonitor
- [ ] Обновить AI prompt для треугольников
- [ ] Добавить визуализацию (опционально)
- [ ] Запустить тесты
- [ ] Обновить документацию

## Поддержка

При возникновении вопросов обращайтесь к документации:
- `TRIANGLE_TRADING.md` - полное руководство
- `triangle-example.ts` - примеры кода
- `test-triangle-detector.js` - тесты
