# Signals Restore - Восстановление оригинального формата

## Проблема
После изменений режим "Сигналы" (Покупка/Продажа) начал показывать другой формат ответа вместо оригинального профессионального формата nasip1.1.

## Решение
Восстановлен оригинальный промпт из backup файла `app/api/visual-analysis/route.ts.backup`.

## Что было восстановлено

### 1. Оригинальный формат ответа nasip1.1

**Market Bias**
- Описание текущего состояния рынка
- Структура: Higher High/Higher Low или Lower High/Lower Low
- Положение относительно SMA20/SMA50
- Кто контролирует рынок

**Buy/Sell Setup**
- Точка входа с обоснованием
- Стоп-лосс с обоснованием
- Цели (3 уровня)
- Risk/Reward соотношение
- Конкретные причины для сделки

**Где может появиться BUY/SELL**
- Дополнительные точки входа
- Условия для появления сигнала
- Уровни для ожидания

**Лучший сценарий сейчас**
- Рекомендация по текущей ситуации
- Конкретные уровни для входа
- Цели движения

### 2. Обновления

**Добавлено:**
- Поддержка правильного форматирования цен (5 знаков для форекса, 2 для остальных)
- Версия изменена с `nasip1.0`/`nasip1.1` на `signal-generator` для единообразия

**Изменено в коде:**
```typescript
// Было
const { imageBase64, action, message, context, version = 'nasip1.0' } = await request.json();
if (version === 'nasip1.1') {

// Стало
const { imageBase64, action, message, context, version = 'signal-generator' } = await request.json();
if (version === 'signal-generator') {
```

**Добавлено форматирование цен:**
```typescript
const asset = context.asset || '';
const isForex = asset.includes('/') && !asset.includes('XAU') && !asset.includes('XAG');
const decimals = isForex ? 5 : 2;

const formattedPrice = typeof context.currentPrice === 'number' 
  ? context.currentPrice.toFixed(decimals) 
  : String(context.currentPrice);
```

## Файлы изменены

1. **app/api/visual-analysis/route.ts**
   - Восстановлен из backup
   - Обновлена версия на `signal-generator`
   - Добавлено правильное форматирование цен

2. **components/AIChat.tsx**
   - Уже передает `version: 'signal-generator'` (было исправлено ранее)

## Как работает теперь

### Режим "Анализ рынка"
- Вызывает `/api/mtf-analysis`
- Показывает мульти-таймфреймовый анализ D1→H4→H1→M15
- Дает рекомендацию BUY/SELL/WAIT

### Режим "Сигналы"
- Вызывает `/api/visual-analysis` с `version: 'signal-generator'`
- Показывает профессиональный формат nasip1.1:
  - Market Bias
  - Buy/Sell Setup
  - Где может появиться сигнал
  - Лучший сценарий

## Тестирование

1. Переключитесь на режим "Сигналы"
2. Нажмите "Покупка" или "Продажа"
3. ✅ Должен появиться ответ в формате:
   - **Market Bias**
   - **Buy/Sell Setup**
   - **Где может появиться BUY/SELL**
   - **Лучший сценарий сейчас**

## Backup
Оригинальный файл сохранен в `app/api/visual-analysis/route.ts.backup` на случай если понадобится восстановить снова.

---
**Дата:** 30 января 2026
**Статус:** ✅ Восстановлено
