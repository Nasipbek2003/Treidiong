# Design Document: Liquidity Engine

## Overview

Liquidity Engine - это модульная система анализа ликвидности, которая интегрируется в существующую торговую платформу как обязательный фильтр для торговых сигналов. Система состоит из нескольких взаимосвязанных компонентов:

- **LiquidityPoolDetector** - идентификация зон ликвидности
- **SweepDetector** - детекция сбора ликвидности
- **BreakoutValidator** - фильтрация ложных пробоев
- **StructureAnalyzer** - определение CHOCH/BOS
- **SignalScorer** - оценка силы сигнала
- **LiquidityStore** - хранение состояния
- **LiquidityAPI** - REST API для интеграции

Система работает на основе анализа свечных данных (OHLCV) и интегрируется с существующими компонентами через API endpoints.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Layer                          │
│  ┌──────────────────┐         ┌─────────────────────────┐  │
│  │ CandlestickChart │◄────────┤  Liquidity Visualization│  │
│  └──────────────────┘         └─────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/WebSocket
┌────────────────────────▼────────────────────────────────────┐
│                    API Layer (Next.js)                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  /api/liquidity/*  (LiquidityAPI)                    │  │
│  └──────────────────────┬───────────────────────────────┘  │
└─────────────────────────┼──────────────────────────────────┘
                          │
┌─────────────────────────▼──────────────────────────────────┐
│                  Liquidity Engine Core                     │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │ LiquidityPool    │  │  SweepDetector   │               │
│  │ Detector         │──►                  │               │
│  └──────────────────┘  └────────┬─────────┘               │
│                                  │                          │
│  ┌──────────────────┐  ┌────────▼─────────┐               │
│  │ Breakout         │  │  Structure       │               │
│  │ Validator        │◄─┤  Analyzer        │               │
│  └────────┬─────────┘  └────────┬─────────┘               │
│           │                     │                          │
│  ┌────────▼─────────────────────▼─────────┐               │
│  │       SignalScorer                     │               │
│  └────────┬───────────────────────────────┘               │
│           │                                                │
│  ┌────────▼───────────┐                                   │
│  │  LiquidityStore    │                                   │
│  └────────────────────┘                                   │
└────────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────▼──────────────────────────────────┐
│              Integration with Existing System              │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │  lib/analysis.ts │  │ lib/indicators.ts│               │
│  └──────────────────┘  └──────────────────┘               │
└────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Исторические данные** (OHLCV) поступают в систему
2. **LiquidityPoolDetector** сканирует данные и идентифицирует зоны ликвидности
3. **SweepDetector** анализирует новые свечи на предмет сбора ликвидности
4. **BreakoutValidator** проверяет валидность пробоев
5. **StructureAnalyzer** определяет смену структуры (CHOCH/BOS)
6. **SignalScorer** оценивает силу сигнала
7. **LiquidityStore** сохраняет состояние
8. **LiquidityAPI** предоставляет данные для визуализации и интеграции

## Components and Interfaces

### 1. LiquidityPoolDetector

**Назначение:** Идентификация зон концентрации ликвидности

**Интерфейс:**

```typescript
interface LiquidityPool {
  id: string;
  type: 'equal_highs' | 'equal_lows' | 'pdh' | 'pdl' | 
        'asian_high' | 'asian_low' | 'range_high' | 'range_low' |
        'trendline_high' | 'trendline_low';
  price: number;
  timestamp: number;
  status: 'active' | 'swept';
  candleIndices: number[]; // индексы свечей, формирующих pool
  strength: number; // количество касаний или значимость
}

interface LiquidityPoolDetector {
  detectEqualHighs(candles: Candlestick[], tolerance: number): LiquidityPool[];
  detectEqualLows(candles: Candlestick[], tolerance: number): LiquidityPool[];
  detectPreviousDayHighLow(candles: Candlestick[]): LiquidityPool[];
  detectAsianRange(candles: Candlestick[]): LiquidityPool[];
  detectRangeHighLow(candles: Candlestick[], minTouches: number): LiquidityPool[];
  detectTrendlineHighLow(candles: Candlestick[]): LiquidityPool[];
  getAllPools(candles: Candlestick[]): LiquidityPool[];
}
```

**Алгоритм detectEqualHighs:**

```
1. Инициализировать пустой массив pools
2. Для каждой свечи i в candles:
   a. Найти все свечи j где |candles[j].high - candles[i].high| <= tolerance * candles[i].high
   b. Если найдено >= 2 свечей:
      - Создать LiquidityPool с type='equal_highs'
      - price = среднее значение high найденных свечей
      - candleIndices = индексы найденных свечей
      - strength = количество найденных свечей
      - Добавить в pools
3. Удалить дубликаты (pools с одинаковыми candleIndices)
4. Вернуть pools
```

**Алгоритм detectAsianRange:**

```
1. Определить временные границы азиатской сессии (00:00-08:00 UTC)
2. Отфильтровать свечи, попадающие в азиатскую сессию
3. Найти максимальный high (Asian High) и минимальный low (Asian Low)
4. Создать два LiquidityPool:
   - type='asian_high', price=Asian High
   - type='asian_low', price=Asian Low
5. Вернуть pools
```

### 2. SweepDetector

**Назначение:** Детекция сбора ликвидности (stop hunt)

**Интерфейс:**

```typescript
interface LiquiditySweep {
  id: string;
  poolId: string; // ID swept pool
  poolType: string;
  sweepPrice: number;
  sweepTimestamp: number;
  candleIndex: number;
  wickSize: number; // размер фитиля в %
  direction: 'up' | 'down'; // направление sweep
  rejectionStrength: number; // сила отката (размер тела свечи после sweep)
}

interface SweepDetector {
  detectSweep(
    candle: Candlestick, 
    activePools: LiquidityPool[]
  ): LiquiditySweep | null;
  
  validateSweepConditions(
    candle: Candlestick,
    pool: LiquidityPool
  ): boolean;
}
```

**Алгоритм detectSweep:**

```
1. Для каждого активного pool в activePools:
   a. Проверить пробой:
      - Если pool.type содержит 'high': candle.high > pool.price
      - Если pool.type содержит 'low': candle.low < pool.price
   
   b. Если пробой произошёл:
      - Проверить закрытие обратно внутри:
        * Для high: candle.close < pool.price
        * Для low: candle.close > pool.price
      
      - Рассчитать размер фитиля:
        * Для high: wickSize = (candle.high - candle.close) / (candle.high - candle.low)
        * Для low: wickSize = (candle.close - candle.low) / (candle.high - candle.low)
      
      - Если wickSize > 0.5:
        * Создать LiquiditySweep
        * rejectionStrength = |candle.close - candle.open| / (candle.high - candle.low)
        * Вернуть sweep
        
2. Если sweep не найден, вернуть null
```

### 3. BreakoutValidator

**Назначение:** Фильтрация ложных пробоев

**Интерфейс:**

```typescript
interface BreakoutValidation {
  isValid: boolean;
  reasons: string[]; // причины невалидности
  volumeCheck: boolean;
  closeCheck: boolean;
  wickCheck: boolean;
  divergenceCheck: boolean;
}

interface BreakoutValidator {
  validateBreakout(
    candle: Candlestick,
    pool: LiquidityPool,
    volumeData: number[],
    rsiData: number[]
  ): BreakoutValidation;
  
  checkVolumeSpike(currentVolume: number, avgVolume: number): boolean;
  checkRSIDivergence(prices: number[], rsiValues: number[]): boolean;
}
```

**Алгоритм validateBreakout:**

```
1. Инициализировать validation = { isValid: true, reasons: [] }

2. Проверка объёма:
   - avgVolume = среднее значение последних 20 свечей из volumeData
   - Если candle.volume < avgVolume * 1.5:
     * validation.volumeCheck = false
     * validation.reasons.push("Недостаточный объём")
     * validation.isValid = false

3. Проверка закрытия:
   - Если пробой вверх И candle.close <= pool.price:
     * validation.closeCheck = false
     * validation.reasons.push("Нет закрытия за уровнем")
     * validation.isValid = false
   - Если пробой вниз И candle.close >= pool.price:
     * validation.closeCheck = false
     * validation.reasons.push("Нет закрытия за уровнем")
     * validation.isValid = false

4. Проверка фитиля:
   - wickRatio = размер фитиля / размер свечи
   - Если wickRatio > 0.5:
     * validation.wickCheck = false
     * validation.reasons.push("Длинный фитиль - отказ цены")
     * validation.isValid = false

5. Проверка RSI дивергенции:
   - Если checkRSIDivergence(prices, rsiData) == true:
     * validation.divergenceCheck = false
     * validation.reasons.push("RSI дивергенция")
     * validation.isValid = false

6. Вернуть validation
```

**Алгоритм checkRSIDivergence:**

```
1. Взять последние 3 значения prices и rsiValues
2. Проверить бычью дивергенцию:
   - Если prices[2] > prices[0] И rsiValues[2] < rsiValues[0]:
     * Вернуть true (дивергенция найдена)
3. Проверить медвежью дивергенцию:
   - Если prices[2] < prices[0] И rsiValues[2] > rsiValues[0]:
     * Вернуть true (дивергенция найдена)
4. Вернуть false (дивергенции нет)
```

### 4. StructureAnalyzer

**Назначение:** Определение смены структуры рынка (CHOCH/BOS)

**Интерфейс:**

```typescript
interface StructureChange {
  id: string;
  type: 'CHOCH' | 'BOS';
  direction: 'up' | 'down';
  price: number;
  timestamp: number;
  candleIndex: number;
  previousStructure: 'uptrend' | 'downtrend' | 'range';
  significance: number; // значимость изменения (0-1)
}

interface StructureAnalyzer {
  detectCHOCH(
    candles: Candlestick[],
    recentSweep: LiquiditySweep | null
  ): StructureChange | null;
  
  detectBOS(
    candles: Candlestick[],
    currentTrend: 'uptrend' | 'downtrend'
  ): StructureChange | null;
  
  identifySwingPoints(candles: Candlestick[]): SwingPoint[];
}

interface SwingPoint {
  type: 'high' | 'low';
  price: number;
  candleIndex: number;
}
```

**Алгоритм detectCHOCH:**

```
1. Если recentSweep == null, вернуть null

2. Идентифицировать swing points за последние N свечей (N=20)

3. Если recentSweep.direction == 'up' (sweep high):
   a. Найти последний swing high перед sweep
   b. Найти текущий swing high после sweep
   c. Если текущий high < последний high:
      - Создать StructureChange:
        * type = 'CHOCH'
        * direction = 'down'
        * previousStructure = 'uptrend'
        * significance = (последний high - текущий high) / последний high
      - Вернуть StructureChange

4. Если recentSweep.direction == 'down' (sweep low):
   a. Найти последний swing low перед sweep
   b. Найти текущий swing low после sweep
   c. Если текущий low > последний low:
      - Создать StructureChange:
        * type = 'CHOCH'
        * direction = 'up'
        * previousStructure = 'downtrend'
        * significance = (текущий low - последний low) / последний low
      - Вернуть StructureChange

5. Вернуть null
```

**Алгоритм detectBOS:**

```
1. Идентифицировать swing points за последние N свечей (N=50)

2. Если currentTrend == 'uptrend':
   a. Найти последний значимый swing low
   b. Проверить, пробила ли текущая цена этот low
   c. Если да:
      - Создать StructureChange:
        * type = 'BOS'
        * direction = 'down'
        * previousStructure = 'uptrend'
      - Вернуть StructureChange

3. Если currentTrend == 'downtrend':
   a. Найти последний значимый swing high
   b. Проверить, пробила ли текущая цена этот high
   c. Если да:
      - Создать StructureChange:
        * type = 'BOS'
        * direction = 'up'
        * previousStructure = 'downtrend'
      - Вернуть StructureChange

4. Вернуть null
```

**Алгоритм identifySwingPoints:**

```
1. Инициализировать пустой массив swingPoints
2. Для каждой свечи i (от 2 до length-2):
   a. Проверить swing high:
      - Если candles[i].high > candles[i-1].high И
        candles[i].high > candles[i-2].high И
        candles[i].high > candles[i+1].high И
        candles[i].high > candles[i+2].high:
        * Добавить SwingPoint { type: 'high', price: candles[i].high, candleIndex: i }
   
   b. Проверить swing low:
      - Если candles[i].low < candles[i-1].low И
        candles[i].low < candles[i-2].low И
        candles[i].low < candles[i+1].low И
        candles[i].low < candles[i+2].low:
        * Добавить SwingPoint { type: 'low', price: candles[i].low, candleIndex: i }

3. Вернуть swingPoints
```

### 5. SignalScorer

**Назначение:** Оценка силы торгового сигнала

**Интерфейс:**

```typescript
interface SignalScore {
  totalScore: number; // 0-100
  breakdown: {
    sweepScore: number; // 0-25
    bosScore: number; // 0-30
    divergenceScore: number; // 0-15
    volumeScore: number; // 0-10
    htfScore: number; // 0-20
  };
  components: string[]; // описание компонентов
}

interface SignalScorer {
  calculateScore(
    sweep: LiquiditySweep | null,
    structureChange: StructureChange | null,
    hasDivergence: boolean,
    hasVolumeSpike: boolean,
    isHTFLevel: boolean
  ): SignalScore;
  
  normalizeScore(rawScore: number): number;
}
```

**Алгоритм calculateScore:**

```
1. Инициализировать score = {
     totalScore: 0,
     breakdown: { sweepScore: 0, bosScore: 0, divergenceScore: 0, volumeScore: 0, htfScore: 0 },
     components: []
   }

2. Если sweep != null:
   - score.breakdown.sweepScore = 25
   - score.components.push(`Liquidity Sweep (${sweep.poolType})`)

3. Если structureChange != null И structureChange.type == 'BOS':
   - score.breakdown.bosScore = 30
   - score.components.push(`BOS ${structureChange.direction}`)

4. Если hasDivergence == true:
   - score.breakdown.divergenceScore = 15
   - score.components.push("RSI Divergence")

5. Если hasVolumeSpike == true:
   - score.breakdown.volumeScore = 10
   - score.components.push("Volume Spike")

6. Если isHTFLevel == true:
   - score.breakdown.htfScore = 20
   - score.components.push("HTF Level")

7. Рассчитать totalScore:
   - totalScore = sweepScore + bosScore + divergenceScore + volumeScore + htfScore

8. Нормализовать score (0-100):
   - score.totalScore = normalizeScore(totalScore)

9. Вернуть score
```

### 6. LiquidityStore

**Назначение:** Хранение состояния системы

**Интерфейс:**

```typescript
interface LiquidityStore {
  // Liquidity Pools
  saveLiquidityPool(pool: LiquidityPool): Promise<void>;
  getLiquidityPools(symbol: string, status?: 'active' | 'swept'): Promise<LiquidityPool[]>;
  updatePoolStatus(poolId: string, status: 'active' | 'swept'): Promise<void>;
  
  // Sweeps
  saveSweep(sweep: LiquiditySweep): Promise<void>;
  getSweeps(symbol: string, startTime?: number, endTime?: number): Promise<LiquiditySweep[]>;
  
  // Structure Changes
  saveStructureChange(change: StructureChange): Promise<void>;
  getStructureChanges(symbol: string, startTime?: number, endTime?: number): Promise<StructureChange[]>;
  
  // Signals
  saveSignal(signal: TradingSignal): Promise<void>;
  getLatestSignal(symbol: string): Promise<TradingSignal | null>;
}

interface TradingSignal {
  id: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  score: SignalScore;
  timestamp: number;
  sweepId?: string;
  structureChangeId?: string;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  reasoning: string;
}
```

**Реализация:** In-memory хранилище с опциональной персистентностью в файл/БД

### 7. LiquidityAPI

**Назначение:** REST API для интеграции с фронтендом и существующей системой

**Endpoints:**

```typescript
// GET /api/liquidity/pools?symbol=BTCUSDT&status=active
interface GetPoolsResponse {
  pools: LiquidityPool[];
  count: number;
}

// GET /api/liquidity/sweeps?symbol=BTCUSDT&startTime=...&endTime=...
interface GetSweepsResponse {
  sweeps: LiquiditySweep[];
  count: number;
}

// GET /api/liquidity/structure?symbol=BTCUSDT
interface GetStructureResponse {
  changes: StructureChange[];
  currentTrend: 'uptrend' | 'downtrend' | 'range';
}

// POST /api/liquidity/analyze
interface AnalyzeRequest {
  symbol: string;
  candles: Candlestick[];
  config?: LiquidityConfig;
}

interface AnalyzeResponse {
  pools: LiquidityPool[];
  sweeps: LiquiditySweep[];
  structureChanges: StructureChange[];
  signal: TradingSignal | null;
}

// GET /api/liquidity/signal?symbol=BTCUSDT
interface GetSignalResponse {
  signal: TradingSignal | null;
  isValid: boolean;
  blockReasons: string[]; // причины блокировки, если сигнал невалиден
}
```

## Data Models

### Candlestick

```typescript
interface Candlestick {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
```

### LiquidityConfig

```typescript
interface LiquidityConfig {
  // Tolerance для Equal Highs/Lows (%)
  equalTolerance: number; // default: 0.1
  
  // Минимальный размер фитиля для sweep (%)
  minWickSize: number; // default: 0.5
  
  // Множитель для volume spike
  volumeSpikeMultiplier: number; // default: 1.5
  
  // Веса для scoring
  scoreWeights: {
    sweep: number; // default: 25
    bos: number; // default: 30
    divergence: number; // default: 15
    volume: number; // default: 10
    htf: number; // default: 20
  };
  
  // Таймфреймы для HTF анализа
  htfTimeframes: string[]; // default: ['1d', '1w']
  
  // Минимальное количество касаний для Range High/Low
  minRangeTouches: number; // default: 3
  
  // Lookback период для swing points
  swingLookback: number; // default: 20
}
```

## Correctness Properties

*Свойство (property) - это характеристика или поведение, которое должно выполняться для всех валидных входных данных системы. Свойства служат мостом между человеко-читаемыми спецификациями и машинно-проверяемыми гарантиями корректности.*


### Property 1: Equal Levels Detection
*For any* набор свечей с 2+ свечами, имеющими High или Low в пределах заданного tolerance, система должна идентифицировать их как Equal Highs или Equal Lows соответственно.
**Validates: Requirements 1.1, 1.2**

### Property 2: Previous Day High/Low Persistence
*For any* переход между торговыми днями, система должна сохранять максимальный High и минимальный Low предыдущего дня как liquidity pools типа PDH и PDL.
**Validates: Requirements 1.3**

### Property 3: Asian Range Detection
*For any* завершённая азиатская сессия (00:00-08:00 UTC), система должна определять максимальный High и минимальный Low этой сессии как Asian High и Asian Low liquidity pools.
**Validates: Requirements 1.4**

### Property 4: Range High/Low Detection
*For any* боковое движение с минимум N касаний границ (N из конфигурации), система должна идентифицировать верхнюю и нижнюю границы как Range High и Range Low liquidity pools.
**Validates: Requirements 1.5**

### Property 5: Trendline Extremes Detection
*For any* трендовое движение, система должна идентифицировать экстремумы тренда как Trendline High и Trendline Low liquidity pools.
**Validates: Requirements 1.6**

### Property 6: Valid Sweep Detection
*For any* свеча, которая пробивает liquidity pool И закрывается обратно внутри диапазона И имеет фитиль > 50% размера свечи, система должна фиксировать liquidity sweep с сохранением типа pool, цены sweep и timestamp.
**Validates: Requirements 2.1, 2.2, 2.3**

### Property 7: Multiple Sweeps Registration
*For any* свеча, пробивающая несколько liquidity pools одновременно, система должна регистрировать sweep для каждого пробитого pool.
**Validates: Requirements 2.4**

### Property 8: Swept Pool Status Update
*For any* liquidity pool, после детекции sweep этого pool, его статус должен измениться на 'swept', и он не должен использоваться в дальнейшем анализе активных pools.
**Validates: Requirements 2.5**

### Property 9: Breakout Validation Completeness
*For any* пробой уровня, если выполнены все условия (volume spike >= 1.5x, закрытие за уровнем, фитиль <= 50%, нет RSI дивергенции), то пробой должен классифицироваться как валидный; иначе - как невалидный с указанием причин.
**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

### Property 10: CHOCH Detection
*For any* liquidity sweep, если после sweep high формируется lower high, система должна детектировать CHOCH down; если после sweep low формируется higher low, система должна детектировать CHOCH up.
**Validates: Requirements 4.1, 4.2**

### Property 11: BOS Detection
*For any* установленный тренд (uptrend/downtrend), если цена пробивает последний значимый swing point в противоположном направлении, система должна детектировать BOS с соответствующим направлением.
**Validates: Requirements 4.3, 4.4**

### Property 12: Structure Change Data Persistence
*For any* детектированный CHOCH или BOS, система должна сохранять тип структурного изменения, направление и цену пробоя.
**Validates: Requirements 4.5**

### Property 13: Signal Blocking Without Prerequisites
*For any* ситуация, где liquidity pool не был swept ИЛИ нет подтверждения структуры (CHOCH/BOS), система должна блокировать генерацию торгового сигнала.
**Validates: Requirements 5.1, 5.2**

### Property 14: Valid Signal Generation
*For any* выполненная последовательность (Liquidity Sweep → Rejection → BOS/CHOCH → Retest зоны), система должна генерировать торговый сигнал с правильным направлением (BUY/SELL).
**Validates: Requirements 5.3, 5.5**

### Property 15: Retest Detection
*For any* движение цены после sweep и структурного изменения, если цена возвращается к зоне sweep (в пределах tolerance), система должна детектировать retest.
**Validates: Requirements 5.4**

### Property 16: Score Components Addition
*For any* торговый сигнал, итоговый score должен быть суммой баллов за присутствующие компоненты: sweep (+25), BOS (+30), RSI divergence (+15), volume spike (+10), HTF level (+20).
**Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**

### Property 17: Score Normalization
*For any* рассчитанный score, итоговое значение должно быть нормализовано в диапазон [0, 100].
**Validates: Requirements 6.6**

### Property 18: External Signal Filtering
*For any* торговый сигнал из существующей системы, если он не имеет подтверждения liquidity sweep ИЛИ классифицирован как ложный пробой, Liquidity Engine должен блокировать этот сигнал.
**Validates: Requirements 7.1, 7.2**

### Property 19: Valid Signal Propagation
*For any* валидная последовательность (sweep → BOS → retest), детектированная Liquidity Engine, сигнал с рассчитанным score должен передаваться в существующую систему для финальной оценки.
**Validates: Requirements 7.3, 7.4**

### Property 20: Visualization Data Completeness
*For any* запрос данных для визуализации, система должна предоставлять все liquidity pools, sweeps и структурные изменения с координатами для отрисовки.
**Validates: Requirements 7.5**

### Property 21: Liquidity Pool Persistence
*For any* детектированный liquidity pool, система должна сохранять его с типом, ценой, timestamp и статусом (active/swept).
**Validates: Requirements 8.1**

### Property 22: Sweep Status Update
*For any* liquidity sweep, статус соответствующего pool должен обновиться на "swept", и детали sweep должны сохраниться.
**Validates: Requirements 8.2**

### Property 23: Active Pools Filtering
*For any* запрос активных liquidity pools для инструмента, система должна возвращать только pools со статусом "active".
**Validates: Requirements 8.3**

### Property 24: Sweep History Chronological Order
*For any* запрос истории sweeps за период, система должна возвращать все swept pools с деталями в хронологическом порядке.
**Validates: Requirements 8.4**

### Property 25: State Recovery After Restart
*For any* перезапуск системы, состояние liquidity pools должно восстанавливаться из persistent storage.
**Validates: Requirements 8.5**

### Property 26: API Response Completeness
*For any* API запрос данных ликвидности, response должен содержать все активные и swept pools в валидном JSON формате с координатами для визуализации.
**Validates: Requirements 9.1, 9.2**

### Property 27: Sweep Details Completeness
*For any* запрос деталей sweep, response должен включать направление sweep, размер фитиля и информацию о последующей структуре.
**Validates: Requirements 9.3**

### Property 28: Signal Response Completeness
*For any* запрос текущего торгового сигнала, response должен включать score, направление и обоснование (sweep type, BOS type).
**Validates: Requirements 9.4**

### Property 29: Configuration Parameter Usage
*For any* параметр конфигурации (tolerance, minWickSize, volumeSpikeMultiplier, scoreWeights, htfTimeframes), система должна использовать заданное значение при соответствующих вычислениях.
**Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5**

## Error Handling

### Error Categories

1. **Invalid Input Data**
   - Пустой массив свечей
   - Свечи с некорректными OHLCV значениями (negative, NaN, null)
   - Отсутствующие обязательные поля

2. **Configuration Errors**
   - Некорректные значения параметров (tolerance < 0, weights < 0)
   - Отсутствующие обязательные параметры конфигурации

3. **State Inconsistency**
   - Попытка обновить несуществующий pool
   - Попытка sweep уже swept pool
   - Конфликты при concurrent updates

4. **API Errors**
   - Некорректные query parameters
   - Отсутствующие обязательные параметры запроса
   - Timeout при запросе данных

### Error Handling Strategy

**Validation Layer:**
```typescript
function validateCandlestick(candle: Candlestick): ValidationResult {
  const errors: string[] = [];
  
  if (candle.high < candle.low) {
    errors.push("High cannot be less than Low");
  }
  
  if (candle.close > candle.high || candle.close < candle.low) {
    errors.push("Close must be within High-Low range");
  }
  
  if (candle.open > candle.high || candle.open < candle.low) {
    errors.push("Open must be within High-Low range");
  }
  
  if (candle.volume < 0) {
    errors.push("Volume cannot be negative");
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
```

**Error Response Format:**
```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string; // "INVALID_INPUT", "CONFIG_ERROR", "STATE_ERROR", "API_ERROR"
    message: string;
    details?: any;
  };
}
```

**Graceful Degradation:**
- При ошибке детекции одного типа pool, продолжать детекцию других типов
- При ошибке в одном компоненте, не блокировать работу других компонентов
- Логировать все ошибки для debugging

**Retry Strategy:**
- Для transient errors (network, timeout) - retry с exponential backoff
- Для permanent errors (validation) - немедленный fail с описанием ошибки

## Testing Strategy

### Dual Testing Approach

Система тестируется двумя комплементарными подходами:

**Unit Tests:**
- Специфические примеры и edge cases
- Интеграционные точки между компонентами
- Обработка ошибок и граничные условия
- Примеры:
  - Детекция Equal Highs с ровно 2 свечами
  - Sweep с фитилём ровно 50%
  - Пустой массив свечей
  - Некорректные OHLCV значения

**Property-Based Tests:**
- Универсальные свойства для всех входных данных
- Комплексные сценарии с рандомизацией
- Проверка инвариантов системы
- Минимум 100 итераций на тест

### Property-Based Testing Configuration

**Библиотека:** fast-check (для TypeScript/JavaScript)

**Конфигурация тестов:**
```typescript
import fc from 'fast-check';

// Пример property test
describe('Liquidity Engine Properties', () => {
  it('Property 1: Equal Levels Detection', () => {
    // Feature: liquidity-engine, Property 1: Equal Levels Detection
    fc.assert(
      fc.property(
        fc.array(candlestickArbitrary(), { minLength: 2, maxLength: 100 }),
        fc.double({ min: 0.001, max: 1.0 }),
        (candles, tolerance) => {
          const detector = new LiquidityPoolDetector();
          const pools = detector.detectEqualHighs(candles, tolerance);
          
          // Проверка: все найденные pools действительно имеют Equal Highs
          for (const pool of pools) {
            const prices = pool.candleIndices.map(i => candles[i].high);
            const maxDiff = Math.max(...prices) - Math.min(...prices);
            const avgPrice = prices.reduce((a, b) => a + b) / prices.length;
            expect(maxDiff / avgPrice).toBeLessThanOrEqual(tolerance);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

**Генераторы данных:**
```typescript
// Генератор валидных свечей
function candlestickArbitrary(): fc.Arbitrary<Candlestick> {
  return fc.record({
    timestamp: fc.integer({ min: 0 }),
    open: fc.double({ min: 1, max: 100000 }),
    high: fc.double({ min: 1, max: 100000 }),
    low: fc.double({ min: 1, max: 100000 }),
    close: fc.double({ min: 1, max: 100000 }),
    volume: fc.double({ min: 0, max: 1000000 })
  }).filter(c => 
    c.high >= Math.max(c.open, c.close) &&
    c.low <= Math.min(c.open, c.close)
  );
}

// Генератор свечей с Equal Highs
function candlesWithEqualHighs(count: number, tolerance: number): fc.Arbitrary<Candlestick[]> {
  return fc.tuple(
    fc.double({ min: 1, max: 100000 }),
    fc.array(candlestickArbitrary(), { minLength: count, maxLength: count })
  ).map(([targetHigh, candles]) => {
    // Модифицируем первые count свечей для Equal Highs
    return candles.map((c, i) => {
      if (i < count) {
        const variation = targetHigh * tolerance * (Math.random() - 0.5);
        return { ...c, high: targetHigh + variation };
      }
      return c;
    });
  });
}
```

### Test Coverage Requirements

**Минимальное покрытие:**
- Unit tests: 80% code coverage
- Property tests: все 29 свойств из Correctness Properties
- Integration tests: все API endpoints
- Error handling: все error categories

**Критические пути:**
- Полная последовательность: Pool Detection → Sweep → Structure Change → Signal Generation
- Фильтрация ложных пробоев
- Scoring система
- State persistence и recovery

### Testing Tools

- **Test Framework:** Jest
- **Property Testing:** fast-check
- **Mocking:** jest.mock для external dependencies
- **Coverage:** jest --coverage
- **CI/CD:** Автоматический запуск тестов при каждом commit

### Performance Testing

**Benchmarks:**
- Детекция pools на 1000 свечей: < 100ms
- Детекция sweep на новой свече: < 10ms
- Расчёт score: < 5ms
- API response time: < 200ms

**Load Testing:**
- Concurrent requests: 100 req/s
- Memory usage: < 500MB для 10000 pools
- CPU usage: < 50% при нормальной нагрузке
