# Implementation Plan: Liquidity Engine

## Overview

Реализация системы анализа ликвидности для торгового ИИ. Система состоит из 7 основных компонентов, которые будут реализованы инкрементально с тестированием на каждом этапе. Используется TypeScript с интеграцией в существующую Next.js платформу.

## Tasks

- [x] 1. Настройка инфраструктуры и базовых типов
  - Создать директорию `lib/liquidity/` для всех компонентов Liquidity Engine
  - Определить базовые TypeScript интерфейсы: `Candlestick`, `LiquidityPool`, `LiquiditySweep`, `StructureChange`, `SignalScore`, `TradingSignal`, `LiquidityConfig`
  - Создать файл `lib/liquidity/types.ts` с экспортом всех типов
  - Настроить Jest для тестирования с поддержкой TypeScript
  - Установить fast-check для property-based testing
  - _Requirements: 8.1, 10.1-10.5_

- [x] 2. Реализация LiquidityPoolDetector
  - [x] 2.1 Создать класс LiquidityPoolDetector в `lib/liquidity/pool-detector.ts`
    - Реализовать метод `detectEqualHighs()` для поиска Equal Highs с учётом tolerance
    - Реализовать метод `detectEqualLows()` для поиска Equal Lows с учётом tolerance
    - Реализовать метод `detectPreviousDayHighLow()` для PDH/PDL
    - Реализовать метод `detectAsianRange()` для Asian High/Low (00:00-08:00 UTC)
    - Реализовать метод `detectRangeHighLow()` для Range High/Low с минимальным количеством касаний
    - Реализовать метод `detectTrendlineHighLow()` для Trendline High/Low
    - Реализовать метод `getAllPools()` для агрегации всех типов pools
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_
  
  - [x] 2.2 Property test: Equal Levels Detection
    - **Property 1: Equal Levels Detection**
    - **Validates: Requirements 1.1, 1.2**
    - Генерировать случайные наборы свечей с Equal Highs/Lows
    - Проверять, что все найденные pools действительно имеют цены в пределах tolerance
  
  - [x] 2.3 Property test: Previous Day High/Low Persistence
    - **Property 2: Previous Day High/Low Persistence**
    - **Validates: Requirements 1.3**
    - Генерировать случайные данные за несколько дней
    - Проверять, что PDH/PDL корректно сохраняются при переходе дней
  
  - [x] 2.4 Property test: Asian Range Detection
    - **Property 3: Asian Range Detection**
    - **Validates: Requirements 1.4**
    - Генерировать случайные данные в азиатское время
    - Проверять корректность определения Asian High/Low
  
  - [x] 2.5 Property test: Range High/Low Detection
    - **Property 4: Range High/Low Detection**
    - **Validates: Requirements 1.5**
    - Генерировать случайные боковые диапазоны с разным количеством касаний
    - Проверять детекцию Range High/Low
  
  - [x] 2.6 Property test: Trendline Extremes Detection
    - **Property 5: Trendline Extremes Detection**
    - **Validates: Requirements 1.6**
    - Генерировать случайные трендовые движения
    - Проверять определение Trendline High/Low
  
  - [x] 2.7 Unit tests для LiquidityPoolDetector
    - Тест с пустым массивом свечей
    - Тест с некорректными OHLCV значениями
    - Тест с ровно 2 свечами для Equal Highs/Lows
    - Тест граничных случаев tolerance (0%, 100%)

- [x] 3. Реализация SweepDetector
  - [x] 3.1 Создать класс SweepDetector в `lib/liquidity/sweep-detector.ts`
    - Реализовать метод `detectSweep()` для детекции liquidity sweep
    - Реализовать метод `validateSweepConditions()` для проверки условий sweep
    - Реализовать расчёт размера фитиля (wickSize)
    - Реализовать расчёт силы отката (rejectionStrength)
    - _Requirements: 2.1, 2.2, 2.3_
  
  - [x] 3.2 Property test: Valid Sweep Detection
    - **Property 6: Valid Sweep Detection**
    - **Validates: Requirements 2.1, 2.2, 2.3**
    - Генерировать случайные свечи с пробоем и закрытием внутри
    - Проверять детекцию sweep только при wickSize > 50%
    - Проверять сохранение всех полей sweep (type, price, timestamp)
  
  - [x] 3.3 Property test: Multiple Sweeps Registration
    - **Property 7: Multiple Sweeps Registration**
    - **Validates: Requirements 2.4**
    - Генерировать свечи, пробивающие несколько pools
    - Проверять регистрацию всех sweeps
  
  - [x] 3.4 Property test: Swept Pool Status Update
    - **Property 8: Swept Pool Status Update**
    - **Validates: Requirements 2.5**
    - Генерировать sweep событие
    - Проверять изменение статуса pool на 'swept'
    - Проверять, что swept pool не используется в дальнейшем анализе
  
  - [x] 3.5 Unit tests для SweepDetector
    - Тест sweep с фитилём ровно 50%
    - Тест sweep без закрытия внутри диапазона
    - Тест sweep с некорректным pool

- [x] 4. Checkpoint - Базовая детекция работает
  - Убедиться, что все тесты для LiquidityPoolDetector и SweepDetector проходят
  - Проверить интеграцию между компонентами
  - Спросить пользователя, если возникли вопросы

- [x] 5. Реализация BreakoutValidator
  - [x] 5.1 Создать класс BreakoutValidator в `lib/liquidity/breakout-validator.ts`
    - Реализовать метод `validateBreakout()` для комплексной валидации пробоя
    - Реализовать метод `checkVolumeSpike()` для проверки объёма
    - Реализовать метод `checkRSIDivergence()` для детекции дивергенции
    - Реализовать проверку закрытия за уровнем
    - Реализовать проверку размера фитиля
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [x] 5.2 Property test: Breakout Validation Completeness
    - **Property 9: Breakout Validation Completeness**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
    - Генерировать случайные пробои с разными комбинациями условий
    - Проверять, что валидными считаются только пробои со всеми выполненными условиями
    - Проверять корректность причин невалидности
  
  - [x] 5.3 Unit tests для BreakoutValidator
    - Тест пробоя с объёмом ровно 1.5x
    - Тест пробоя без RSI данных
    - Тест всех комбинаций невалидных условий

- [ ] 6. Реализация StructureAnalyzer
  - [~] 6.1 Создать класс StructureAnalyzer в `lib/liquidity/structure-analyzer.ts`
    - Реализовать метод `identifySwingPoints()` для поиска swing highs/lows
    - Реализовать метод `detectCHOCH()` для детекции Change of Character
    - Реализовать метод `detectBOS()` для детекции Break of Structure
    - Реализовать расчёт significance для структурных изменений
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [~] 6.2 Property test: CHOCH Detection
    - **Property 10: CHOCH Detection**
    - **Validates: Requirements 4.1, 4.2**
    - Генерировать последовательности sweep high → lower high
    - Генерировать последовательности sweep low → higher low
    - Проверять детекцию CHOCH в правильном направлении
  
  - [~] 6.3 Property test: BOS Detection
    - **Property 11: BOS Detection**
    - **Validates: Requirements 4.3, 4.4**
    - Генерировать uptrend с пробоем последнего low
    - Генерировать downtrend с пробоем последнего high
    - Проверять детекцию BOS в правильном направлении
  
  - [~] 6.4 Property test: Structure Change Data Persistence
    - **Property 12: Structure Change Data Persistence**
    - **Validates: Requirements 4.5**
    - Генерировать случайные CHOCH/BOS события
    - Проверять сохранение всех полей (type, direction, price)
  
  - [~] 6.5 Unit tests для StructureAnalyzer
    - Тест с недостаточным количеством свечей для swing points
    - Тест CHOCH без предшествующего sweep
    - Тест BOS в range (не в тренде)

- [ ] 7. Реализация SignalScorer
  - [~] 7.1 Создать класс SignalScorer в `lib/liquidity/signal-scorer.ts`
    - Реализовать метод `calculateScore()` для расчёта итогового score
    - Реализовать метод `normalizeScore()` для нормализации в диапазон 0-100
    - Реализовать логику добавления баллов за каждый компонент (sweep, BOS, divergence, volume, HTF)
    - Реализовать формирование breakdown и components массива
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_
  
  - [~] 7.2 Property test: Score Components Addition
    - **Property 16: Score Components Addition**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**
    - Генерировать случайные комбинации компонентов сигнала
    - Проверять, что score = сумма баллов присутствующих компонентов
    - Проверять корректность breakdown
  
  - [~] 7.3 Property test: Score Normalization
    - **Property 17: Score Normalization**
    - **Validates: Requirements 6.6**
    - Генерировать случайные raw scores
    - Проверять, что нормализованный score в диапазоне [0, 100]
  
  - [~] 7.4 Unit tests для SignalScorer
    - Тест с нулевым score (нет компонентов)
    - Тест с максимальным score (все компоненты)
    - Тест с кастомными весами из конфигурации

- [~] 8. Checkpoint - Основная логика завершена
  - Убедиться, что все компоненты работают корректно
  - Проверить интеграцию между всеми компонентами
  - Спросить пользователя, если возникли вопросы

- [ ] 9. Реализация LiquidityStore
  - [~] 9.1 Создать класс LiquidityStore в `lib/liquidity/store.ts`
    - Реализовать in-memory хранилище для pools, sweeps, structure changes, signals
    - Реализовать методы `saveLiquidityPool()`, `getLiquidityPools()`, `updatePoolStatus()`
    - Реализовать методы `saveSweep()`, `getSweeps()`
    - Реализовать методы `saveStructureChange()`, `getStructureChanges()`
    - Реализовать методы `saveSignal()`, `getLatestSignal()`
    - Реализовать опциональную персистентность в файл (JSON)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [~] 9.2 Property test: Liquidity Pool Persistence
    - **Property 21: Liquidity Pool Persistence**
    - **Validates: Requirements 8.1**
    - Генерировать случайные pools
    - Проверять сохранение всех полей
  
  - [~] 9.3 Property test: Sweep Status Update
    - **Property 22: Sweep Status Update**
    - **Validates: Requirements 8.2**
    - Генерировать sweep события
    - Проверять обновление статуса pool и сохранение деталей
  
  - [~] 9.4 Property test: Active Pools Filtering
    - **Property 23: Active Pools Filtering**
    - **Validates: Requirements 8.3**
    - Генерировать смесь active и swept pools
    - Проверять, что запрос возвращает только active pools
  
  - [~] 9.5 Property test: Sweep History Chronological Order
    - **Property 24: Sweep History Chronological Order**
    - **Validates: Requirements 8.4**
    - Генерировать случайные sweeps в разное время
    - Проверять хронологический порядок в результате
  
  - [~] 9.6 Property test: State Recovery After Restart
    - **Property 25: State Recovery After Restart**
    - **Validates: Requirements 8.5**
    - Сохранить состояние, "перезапустить" (создать новый экземпляр)
    - Проверять восстановление всех pools
  
  - [~] 9.7 Unit tests для LiquidityStore
    - Тест обновления несуществующего pool
    - Тест concurrent updates
    - Тест персистентности в файл

- [ ] 10. Реализация основного Liquidity Engine координатора
  - [~] 10.1 Создать главный класс LiquidityEngine в `lib/liquidity/engine.ts`
    - Интегрировать все компоненты (Detector, SweepDetector, Validator, Analyzer, Scorer, Store)
    - Реализовать метод `analyze()` для полного анализа свечных данных
    - Реализовать метод `validateSignal()` для проверки внешних сигналов
    - Реализовать метод `generateSignal()` для создания торговых сигналов
    - Реализовать логику валидации условий входа (sweep → structure → retest)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [~] 10.2 Property test: Signal Blocking Without Prerequisites
    - **Property 13: Signal Blocking Without Prerequisites**
    - **Validates: Requirements 5.1, 5.2**
    - Генерировать ситуации без sweep или без структурного подтверждения
    - Проверять блокировку генерации сигнала
  
  - [~] 10.3 Property test: Valid Signal Generation
    - **Property 14: Valid Signal Generation**
    - **Validates: Requirements 5.3, 5.5**
    - Генерировать полные валидные последовательности
    - Проверять генерацию сигнала с правильным направлением
  
  - [~] 10.4 Property test: Retest Detection
    - **Property 15: Retest Detection**
    - **Validates: Requirements 5.4**
    - Генерировать движения цены с возвратом к зоне sweep
    - Проверять детекцию retest
  
  - [~] 10.5 Property test: External Signal Filtering
    - **Property 18: External Signal Filtering**
    - **Validates: Requirements 7.1, 7.2**
    - Генерировать внешние сигналы без подтверждения или с ложными пробоями
    - Проверять блокировку этих сигналов
  
  - [~] 10.6 Property test: Valid Signal Propagation
    - **Property 19: Valid Signal Propagation**
    - **Validates: Requirements 7.3, 7.4**
    - Генерировать валидные последовательности
    - Проверять передачу сигнала с score в существующую систему
  
  - [~] 10.7 Integration tests для LiquidityEngine
    - Тест полного цикла: данные → pools → sweep → structure → signal
    - Тест интеграции с существующими компонентами (lib/analysis.ts, lib/indicators.ts)
    - Тест обработки ошибок на каждом этапе

- [ ] 11. Реализация LiquidityAPI (Next.js API routes)
  - [~] 11.1 Создать API endpoint GET /api/liquidity/pools в `app/api/liquidity/pools/route.ts`
    - Обработка query parameters: symbol, status
    - Валидация входных данных
    - Возврат pools в JSON формате
    - Обработка ошибок
    - _Requirements: 9.1, 9.2_
  
  - [~] 11.2 Создать API endpoint GET /api/liquidity/sweeps в `app/api/liquidity/sweeps/route.ts`
    - Обработка query parameters: symbol, startTime, endTime
    - Валидация входных данных
    - Возврат sweeps в JSON формате
    - _Requirements: 9.3_
  
  - [~] 11.3 Создать API endpoint GET /api/liquidity/structure в `app/api/liquidity/structure/route.ts`
    - Обработка query parameter: symbol
    - Возврат structure changes и текущего тренда
    - _Requirements: 9.3_
  
  - [~] 11.4 Создать API endpoint POST /api/liquidity/analyze в `app/api/liquidity/analyze/route.ts`
    - Обработка request body: symbol, candles, config
    - Запуск полного анализа через LiquidityEngine
    - Возврат pools, sweeps, structure changes, signal
    - _Requirements: 7.3, 7.4_
  
  - [~] 11.5 Создать API endpoint GET /api/liquidity/signal в `app/api/liquidity/signal/route.ts`
    - Обработка query parameter: symbol
    - Возврат текущего торгового сигнала с валидацией
    - Возврат причин блокировки, если сигнал невалиден
    - _Requirements: 9.4_
  
  - [~] 11.6 Property test: API Response Completeness
    - **Property 26: API Response Completeness**
    - **Validates: Requirements 9.1, 9.2**
    - Генерировать случайные запросы к API
    - Проверять полноту и валидность JSON response
  
  - [~] 11.7 Property test: Sweep Details Completeness
    - **Property 27: Sweep Details Completeness**
    - **Validates: Requirements 9.3**
    - Генерировать запросы деталей sweep
    - Проверять наличие всех полей (direction, wickSize, structure)
  
  - [~] 11.8 Property test: Signal Response Completeness
    - **Property 28: Signal Response Completeness**
    - **Validates: Requirements 9.4**
    - Генерировать запросы сигнала
    - Проверять наличие score, direction, reasoning
  
  - [~] 11.9 Unit tests для API endpoints
    - Тест некорректных query parameters
    - Тест отсутствующих обязательных параметров
    - Тест timeout handling
    - Тест error responses

- [ ] 12. Реализация визуализации на графике
  - [~] 12.1 Обновить компонент CandlestickChart.tsx
    - Добавить отображение liquidity pools (горизонтальные линии с метками)
    - Добавить отображение liquidity sweeps (маркеры на свечах)
    - Добавить отображение structure changes (CHOCH/BOS маркеры)
    - Добавить отображение торговых сигналов (стрелки BUY/SELL)
    - Добавить легенду для всех элементов ликвидности
    - _Requirements: 7.5_
  
  - [~] 12.2 Property test: Visualization Data Completeness
    - **Property 20: Visualization Data Completeness**
    - **Validates: Requirements 7.5**
    - Генерировать запросы данных для визуализации
    - Проверять наличие всех pools, sweeps, structure changes с координатами
  
  - [~] 12.3 Unit tests для визуализации
    - Тест отрисовки с пустыми данными
    - Тест отрисовки с большим количеством pools (performance)
    - Тест корректности координат

- [ ] 13. Реализация конфигурации
  - [~] 13.1 Создать файл конфигурации `lib/liquidity/config.ts`
    - Определить default конфигурацию (tolerance, minWickSize, volumeSpikeMultiplier, scoreWeights, htfTimeframes)
    - Реализовать функцию `loadConfig()` для загрузки кастомной конфигурации
    - Реализовать валидацию конфигурации
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [~] 13.2 Property test: Configuration Parameter Usage
    - **Property 29: Configuration Parameter Usage**
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5**
    - Генерировать случайные значения параметров конфигурации
    - Проверять, что система использует эти значения при вычислениях
  
  - [~] 13.3 Unit tests для конфигурации
    - Тест с некорректными значениями (negative, NaN)
    - Тест с отсутствующими параметрами (fallback на defaults)
    - Тест валидации конфигурации

- [ ] 14. Интеграция с существующей системой анализа
  - [~] 14.1 Обновить lib/analysis.ts
    - Добавить импорт LiquidityEngine
    - Интегрировать liquidity analysis в существующий анализ
    - Добавить фильтрацию сигналов через Liquidity Engine
    - Добавить агрегацию liquidity score с другими индикаторами
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [~] 14.2 Обновить lib/indicators.ts
    - Добавить liquidity-based индикаторы в общий набор
    - Обеспечить совместимость с существующими индикаторами
  
  - [~] 14.3 Integration tests для полной системы
    - Тест генерации сигнала с учётом всех индикаторов + liquidity
    - Тест блокировки ложных сигналов через liquidity filter
    - Тест агрегации scores из разных источников

- [~] 15. Финальный checkpoint и документация
  - Убедиться, что все тесты проходят (unit + property + integration)
  - Проверить code coverage (минимум 80%)
  - Запустить performance benchmarks
  - Создать примеры использования API в документации
  - Обновить README с описанием Liquidity Engine
  - Спросить пользователя о готовности к production deployment

## Notes

- Все задачи являются обязательными для комплексного тестирования с самого начала
- Каждая задача ссылается на конкретные требования для трассируемости
- Checkpoints обеспечивают инкрементальную валидацию
- Property tests валидируют универсальные свойства корректности (минимум 100 итераций каждый)
- Unit tests валидируют специфические примеры и edge cases
- Все компоненты реализуются на TypeScript с интеграцией в Next.js
