# Исправление форматирования цен

## Проблема

Цены в индикаторах отображались с 2 знаками после запятой для всех активов, но для форекс пар нужно 5 знаков.

**Было:**
```
EMA 12/26/50: $0.61 / $0.61 / $0.61
SMA 20/50/200: $0.61 / $0.61 / $0.60
Bollinger Bands: $0.60 - $0.61
SuperTrend: BUY @ $0.61
Equal Highs: $0.61
```

**Стало:**
```
EMA 12/26/50: 0.61234 / 0.61235 / 0.61236
SMA 20/50/200: 0.61234 / 0.61235 / 0.61230
Bollinger Bands: 0.61200 - 0.61250
SuperTrend: BUY @ 0.61234
Equal Highs: 0.61234
```

## Что исправлено

### 1. TechnicalIndicators.tsx
- Добавлен пропс `asset` для определения типа актива
- Добавлен импорт `formatPrice` из `@/lib/formatPrice`
- Все цены теперь форматируются через `formatValue(price)`
- Убран символ `$` (он не нужен для форекс)
- ATR теперь показывает 5 знаков (для точности волатильности)

### 2. LiquidityIndicators.tsx
- Добавлен импорт `formatPrice` из `@/lib/formatPrice`
- Все цены форматируются через `formatValue(price)`
- Исправлено в:
  - Nearby Pools (Equal Highs, Equal Lows, Range High/Low)
  - Recent Sweeps
  - Structure Changes (CHOCH, BOS)
  - Trading Signal (Entry, Stop Loss, Take Profit)

### 3. app/page.tsx
- Передается пропс `asset` в компонент `TechnicalIndicatorsCard`

## Логика форматирования

Функция `formatPrice` из `lib/formatPrice.ts`:

```typescript
export function formatPrice(price: number, asset: string): string {
  const normalizedAsset = asset.replace('/', '').toUpperCase();
  
  // Валютные пары - 5 знаков
  const forexPairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 
                      'AUDUSD', 'USDCAD', 'NZDUSD', 'EURGBP', 
                      'EURJPY', 'GBPJPY'];
  
  if (forexPairs.includes(normalizedAsset)) {
    return price.toFixed(5);
  }
  
  // Для остальных (золото, серебро, нефть, биткоин) - 2 знака
  return price.toFixed(2);
}
```

## Примеры

### Форекс пары (5 знаков):
- EUR/USD: 1.08234
- GBP/USD: 1.26789
- USD/JPY: 149.12345

### Товары и криптовалюты (2 знака):
- XAU/USD (золото): 2654.32
- XAG/USD (серебро): 31.45
- BTC/USD: 45123.67
- USOIL: 78.90

## Результат

Теперь все цены отображаются с правильным количеством знаков после запятой в зависимости от типа актива:
- **Форекс пары**: 5 знаков (0.61234)
- **Остальные активы**: 2 знака (2654.32)

Это обеспечивает точность для скальпинга на форекс и читаемость для других активов.
