# MTF Analysis Fix - Исправление ошибки

## Проблема
При нажатии кнопок возникали ошибки:
1. **"Анализ рынка"**: `Cannot read properties of undefined (reading 'recommendation')`
2. **"Покупка/Продажа"**: `Cannot read properties of undefined (reading 'recommendation')`

## Причина

### Проблема 1: mtfAnalysis()
Функция `mtfAnalysis()` вызывала неправильный API endpoint:
- ❌ Вызывала: `/api/visual-analysis` 
- ✅ Должна вызывать: `/api/mtf-analysis`

### Проблема 2: visualAnalysis()
Функция `visualAnalysis()` пыталась форматировать ответ как MTF JSON, но API возвращает простой текст:
- ❌ Пыталась читать: `data.analysis.recommendation`
- ✅ Должна читать: `data.response` (простой текст)

## Исправление

### 1. Исправлено в mtfAnalysis() (строка ~224)

**Было:**
```typescript
const response = await fetch('/api/visual-analysis', { ... });
const data = await response.json();
const mtf = data.analysis;
```

**Стало:**
```typescript
const response = await fetch('/api/mtf-analysis', { ... });  // ✅ Правильный endpoint
const data = await response.json();

if (!data.analysis) {
  throw new Error('Invalid response from MTF API');
}

const mtf = data.analysis;
```

### 2. Исправлено в visualAnalysis() (строка ~380)

**Было:**
```typescript
const response = await fetch('/api/visual-analysis', {
  body: JSON.stringify({
    imageBase64,
    context: { ... }
  })
});

const data = await response.json();

// Пыталось форматировать как MTF JSON
const mtf = data.analysis;
const recIcon = mtf.recommendation === 'BUY' ? ...
// ... много кода форматирования MTF
```

**Стало:**
```typescript
const response = await fetch('/api/visual-analysis', {
  body: JSON.stringify({
    imageBase64,
    action,                      // ✅ Передаем action (BUY/SELL)
    version: 'signal-generator', // ✅ Указываем версию
    context: { ... }
  })
});

const data = await response.json();

// ✅ Просто показываем текст из data.response
setMessages(prev => [...prev, { role: 'ai', content: data.response }]);
```

## Что теперь работает

✅ **"Анализ рынка"** → `mtfAnalysis()` → `/api/mtf-analysis`
  - Возвращает структурированный JSON с полями: d1Trend, h4Phase, h1Structure, recommendation
  - Форматируется в красивый мульти-таймфреймовый анализ

✅ **"Покупка/Продажа"** → `visualAnalysis()` → `/api/visual-analysis`
  - Возвращает простой текст в формате nasip1.1
  - Показывается как есть (уже отформатирован AI)

## Разделение функционала

| Режим | Функция | API | Формат ответа | Что показывает |
|-------|---------|-----|---------------|----------------|
| **Анализ рынка** | `mtfAnalysis()` | `/api/mtf-analysis` | JSON структура | MTF анализ D1→H4→H1→M15 |
| **Сигналы** | `visualAnalysis(action)` | `/api/visual-analysis` | Текст | Торговый сценарий с точками входа |

## Тестирование

### Тест 1: Анализ рынка
1. Переключитесь на режим "Анализ рынка"
2. Нажмите кнопку "Анализ рынка"
3. ✅ Должен появиться MTF анализ с рекомендацией BUY/SELL/WAIT

### Тест 2: Сигналы
1. Переключитесь на режим "Сигналы"
2. Нажмите кнопку "Покупка" или "Продажа"
3. ✅ Должен появиться торговый сценарий с точками входа, стоп-лоссом и целями

---
**Дата исправления:** 30 января 2026
**Статус:** ✅ Полностью исправлено
