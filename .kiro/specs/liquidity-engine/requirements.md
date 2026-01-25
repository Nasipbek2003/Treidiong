# Requirements Document: Liquidity Engine

## Introduction

Liquidity Engine - это система анализа ликвидности для торгового ИИ, которая определяет зоны концентрации стоп-лоссов толпы, детектирует их сбор (liquidity sweep) и определяет реальные развороты Smart Money. Система отвечает на ключевой вопрос: "Это реальный пробой или сбор ликвидности?"

Система предотвращает входы на ложных пробоях, защищает от манипуляций и позволяет торговать против толпы после сбора их стоп-лоссов.

## Glossary

- **Liquidity_Engine**: Система анализа ликвидности для торгового ИИ
- **Liquidity_Pool**: Зона концентрации стоп-лоссов (Equal Highs/Lows, PDH/PDL, Asian Range, Range High/Low, Trendline High/Low)
- **Liquidity_Sweep**: Сбор ликвидности (stop hunt) - пробой уровня с закрытием обратно внутри диапазона
- **CHOCH**: Change of Character - смена характера структуры рынка
- **BOS**: Break of Structure - пробой структуры рынка
- **Smart_Money**: Институциональные участники рынка
- **HTF**: Higher Time Frame - старший таймфрейм
- **Signal_Scorer**: Компонент оценки силы торгового сигнала
- **Candlestick**: Свеча на графике с OHLC данными
- **Wick**: Фитиль (тень) свечи

## Requirements

### Requirement 1: Определение Liquidity Pools

**User Story:** Как торговый ИИ, я хочу автоматически определять зоны концентрации ликвидности, чтобы знать где находятся стоп-лоссы толпы.

#### Acceptance Criteria

1. WHEN система анализирует исторические данные, THE Liquidity_Engine SHALL идентифицировать Equal Highs (2+ свечи с одинаковыми High в пределах 0.1% отклонения)
2. WHEN система анализирует исторические данные, THE Liquidity_Engine SHALL идентифицировать Equal Lows (2+ свечи с одинаковыми Low в пределах 0.1% отклонения)
3. WHEN начинается новый торговый день, THE Liquidity_Engine SHALL сохранять Previous Day High и Previous Day Low как liquidity pools
4. WHEN завершается азиатская сессия (00:00-08:00 UTC), THE Liquidity_Engine SHALL определять Asian High и Asian Low как liquidity pools
5. WHEN цена движется в боковом диапазоне (3+ касания границ), THE Liquidity_Engine SHALL определять Range High и Range Low как liquidity pools
6. WHEN формируется трендовое движение, THE Liquidity_Engine SHALL определять Trendline High и Trendline Low как liquidity pools

### Requirement 2: Детекция Liquidity Sweep

**User Story:** Как торговый ИИ, я хочу детектировать сбор ликвидности (stop hunt), чтобы определять манипуляции Smart Money.

#### Acceptance Criteria

1. WHEN цена пробивает liquidity pool И свеча закрывается обратно внутри диапазона, THE Liquidity_Engine SHALL фиксировать liquidity sweep
2. WHEN детектируется liquidity sweep, THE Liquidity_Engine SHALL проверять что длина фитиля составляет более 50% размера свечи
3. WHEN liquidity sweep детектирован, THE Liquidity_Engine SHALL сохранять тип swept pool (high/low), цену sweep и timestamp
4. WHEN происходит sweep нескольких уровней одной свечой, THE Liquidity_Engine SHALL регистрировать все swept pools
5. WHEN liquidity sweep завершён, THE Liquidity_Engine SHALL помечать swept pool как "собранный" и не использовать его повторно

### Requirement 3: Фильтрация Ложных Пробоев

**User Story:** Как торговый ИИ, я хочу отфильтровывать ложные пробои, чтобы не входить в позицию на манипуляциях.

#### Acceptance Criteria

1. WHEN цена пробивает уровень БЕЗ увеличения объёма (volume spike < 1.5x средний), THE Liquidity_Engine SHALL классифицировать пробой как невалидный
2. WHEN свеча пробивает уровень НО закрывается внутри диапазона, THE Liquidity_Engine SHALL классифицировать пробой как невалидный
3. WHEN пробойная свеча имеет фитиль > 50% размера тела, THE Liquidity_Engine SHALL классифицировать пробой как невалидный
4. WHEN RSI показывает дивергенцию при пробое (цена выше, RSI ниже или наоборот), THE Liquidity_Engine SHALL классифицировать пробой как невалидный
5. WHEN все условия валидного пробоя выполнены (объём, закрытие за уровнем, нет длинного фитиля, нет дивергенции), THE Liquidity_Engine SHALL классифицировать пробой как валидный

### Requirement 4: Определение Смены Структуры

**User Story:** Как торговый ИИ, я хочу определять смену структуры рынка (CHOCH/BOS), чтобы подтверждать направление движения после liquidity sweep.

#### Acceptance Criteria

1. WHEN после sweep high формируется lower high, THE Liquidity_Engine SHALL детектировать потенциальный CHOCH down
2. WHEN после sweep low формируется higher low, THE Liquidity_Engine SHALL детектировать потенциальный CHOCH up
3. WHEN цена пробивает последний значимый low в восходящем тренде, THE Liquidity_Engine SHALL детектировать BOS down
4. WHEN цена пробивает последний значимый high в нисходящем тренде, THE Liquidity_Engine SHALL детектировать BOS up
5. WHEN детектирован CHOCH или BOS, THE Liquidity_Engine SHALL сохранять тип структурного изменения, направление и цену пробоя

### Requirement 5: Валидация Условий Входа

**User Story:** Как торговый ИИ, я хочу входить в позицию только после выполнения всех условий, чтобы торговать с высокой вероятностью успеха.

#### Acceptance Criteria

1. WHEN liquidity pool НЕ был swept, THE Liquidity_Engine SHALL блокировать генерацию торгового сигнала
2. WHEN liquidity sweep произошёл НО нет подтверждения структуры (CHOCH/BOS), THE Liquidity_Engine SHALL блокировать генерацию торгового сигнала
3. WHEN выполнена последовательность: Liquidity Sweep → Rejection → BOS/CHOCH → Retest зоны, THE Liquidity_Engine SHALL разрешать генерацию торгового сигнала
4. WHEN цена возвращается к зоне sweep для retest, THE Liquidity_Engine SHALL детектировать retest и подготавливать сигнал входа
5. WHEN все условия валидной последовательности выполнены, THE Liquidity_Engine SHALL генерировать торговый сигнал с направлением (BUY/SELL)

### Requirement 6: Система Оценки Силы Сигнала

**User Story:** Как торговый ИИ, я хочу оценивать силу торгового сигнала в баллах, чтобы интегрировать liquidity analysis с другими индикаторами.

#### Acceptance Criteria

1. WHEN детектирован sweep high или sweep low, THE Signal_Scorer SHALL добавлять 25 баллов к оценке сигнала
2. WHEN после sweep детектирован BOS, THE Signal_Scorer SHALL добавлять 30 баллов к оценке сигнала
3. WHEN присутствует RSI дивергенция в направлении сигнала, THE Signal_Scorer SHALL добавлять 15 баллов к оценке сигнала
4. WHEN детектирован volume spike (> 1.5x средний объём), THE Signal_Scorer SHALL добавлять 10 баллов к оценке сигнала
5. WHEN зона sweep находится на HTF уровне (daily/weekly), THE Signal_Scorer SHALL добавлять 20 баллов к оценке сигнала
6. WHEN рассчитана итоговая оценка, THE Signal_Scorer SHALL нормализовать результат в диапазон 0-100 баллов

### Requirement 7: Интеграция с Существующей Системой

**User Story:** Как торговый ИИ, я хочу использовать Liquidity Engine как обязательный фильтр поверх существующих индикаторов, чтобы предотвращать входы на ложных сигналах.

#### Acceptance Criteria

1. WHEN существующая система генерирует торговый сигнал БЕЗ подтверждения liquidity sweep, THE Liquidity_Engine SHALL блокировать этот сигнал
2. WHEN существующая система генерирует сигнал на пробое И Liquidity_Engine классифицирует его как ложный, THE Liquidity_Engine SHALL блокировать этот сигнал
3. WHEN Liquidity_Engine детектирует валидную последовательность (sweep → BOS → retest), THE Liquidity_Engine SHALL передавать сигнал в существующую систему для финальной оценки
4. WHEN Liquidity_Engine рассчитывает score сигнала, THE Liquidity_Engine SHALL передавать этот score в общую систему оценки для агрегации с другими индикаторами
5. WHEN визуализируются данные на графике, THE Liquidity_Engine SHALL предоставлять данные о liquidity pools, sweeps и структурных изменениях для отображения

### Requirement 8: Хранение и Доступ к Данным

**User Story:** Как система анализа, я хочу эффективно хранить и получать данные о ликвидности, чтобы обеспечить быструю работу и историческую аналитику.

#### Acceptance Criteria

1. WHEN детектирован новый liquidity pool, THE Liquidity_Engine SHALL сохранять его с типом, ценой, timestamp и статусом (active/swept)
2. WHEN происходит liquidity sweep, THE Liquidity_Engine SHALL обновлять статус соответствующего pool на "swept" и сохранять детали sweep
3. WHEN запрашиваются активные liquidity pools для инструмента, THE Liquidity_Engine SHALL возвращать только pools со статусом "active"
4. WHEN запрашивается история sweeps за период, THE Liquidity_Engine SHALL возвращать все swept pools с деталями в хронологическом порядке
5. WHEN система перезапускается, THE Liquidity_Engine SHALL восстанавливать состояние liquidity pools из persistent storage

### Requirement 9: API для Визуализации

**User Story:** Как фронтенд компонент, я хочу получать данные о ликвидности через API, чтобы отображать их на графике.

#### Acceptance Criteria

1. WHEN фронтенд запрашивает данные ликвидности для инструмента и таймфрейма, THE Liquidity_Engine SHALL возвращать все активные и swept pools в JSON формате
2. WHEN запрашиваются данные для визуализации, THE Liquidity_Engine SHALL включать координаты для отрисовки (price levels, timestamps)
3. WHEN запрашиваются детали sweep, THE Liquidity_Engine SHALL возвращать информацию о направлении sweep, размере фитиля и последующей структуре
4. WHEN запрашивается текущий торговый сигнал, THE Liquidity_Engine SHALL возвращать сигнал с score, направлением и обоснованием (sweep type, BOS type)
5. WHEN происходит обновление данных в реальном времени, THE Liquidity_Engine SHALL поддерживать streaming updates через WebSocket или Server-Sent Events

### Requirement 10: Конфигурация и Параметры

**User Story:** Как администратор системы, я хочу настраивать параметры Liquidity Engine, чтобы адаптировать систему под разные рынки и стратегии.

#### Acceptance Criteria

1. WHERE конфигурация определяет tolerance для Equal Highs/Lows, THE Liquidity_Engine SHALL использовать этот параметр при идентификации pools (по умолчанию 0.1%)
2. WHERE конфигурация определяет минимальный размер фитиля для sweep, THE Liquidity_Engine SHALL использовать этот параметр при детекции sweeps (по умолчанию 50%)
3. WHERE конфигурация определяет множитель volume spike, THE Liquidity_Engine SHALL использовать этот параметр при фильтрации пробоев (по умолчанию 1.5x)
4. WHERE конфигурация определяет веса для scoring системы, THE Signal_Scorer SHALL использовать эти веса при расчёте итогового score
5. WHERE конфигурация определяет таймфреймы для HTF анализа, THE Liquidity_Engine SHALL использовать эти таймфреймы при определении HTF уровней
