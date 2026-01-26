# Trading Signal Notification System

Система автоматического мониторинга рынка и отправки уведомлений о торговых возможностях.

## Архитектура

Система состоит из трех основных компонентов:

### 1. SignalMonitor (Background Worker)

Выполняет периодический анализ рынка каждые 10 минут:

```typescript
import { SignalMonitor } from './lib/signals';
import { LiquidityEngine } from './lib/liquidity/engine';
import { NotificationManager } from './lib/signals';

const engine = new LiquidityEngine(config);
const notificationManager = new NotificationManager(preferences);
const monitor = new SignalMonitor(engine, notificationManager);

// Запуск мониторинга
monitor.start();

// Остановка
monitor.stop();
```

### 2. NotificationManager

Управляет созданием, отправкой и историей уведомлений:

```typescript
import { NotificationManager } from './lib/signals';

const manager = new NotificationManager({
  enableWarning: true,
  enableUrgent: true,
  minScore: 60,
  enablePush: true,
  enableInApp: true,
});

// Создать уведомление
const notification = manager.createNotification(
  signal,
  'Объяснение на русском',
  'urgent'
);

// Получить историю
const history = manager.getHistory();

// Отклонить уведомление
manager.dismiss(notificationId);
```

### 3. Two-Tier Analysis

#### Tier 1: Технический анализ (LiquidityEngine)

- Детекция liquidity pools
- Обнаружение liquidity sweeps
- Анализ структуры (CHOCH/BOS)
- Расчет score (0-100)

Если score >= 60, переходим к Tier 2.

#### Tier 2: AI подтверждение

- Отправка данных Tier 1 в AI
- Получение подтверждения и объяснения на русском
- Fallback на template-based объяснение при ошибке

## Уровни срочности

### Warning (60-79)

- Потенциальная возможность
- Рекомендуется подготовиться в течение 15-30 минут
- Cooldown: 30 минут

### Urgent (80+)

- Сильный сигнал
- Рекомендуется немедленное действие
- Cooldown: 15 минут

## API Endpoints

### GET /api/signals/history

Получить историю уведомлений:

```typescript
const response = await fetch('/api/signals/history?startDate=1234567890');
const { history } = await response.json();
```

### POST /api/signals/dismiss

Отклонить уведомление:

```typescript
await fetch('/api/signals/dismiss', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ notificationId: 'xxx' }),
});
```

### POST /api/signals/preferences

Обновить настройки:

```typescript
await fetch('/api/signals/preferences', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    enableWarning: true,
    enableUrgent: true,
    minScore: 70,
  }),
});
```

### GET /api/signals/monitor

Статус мониторинга:

```typescript
const response = await fetch('/api/signals/monitor');
const { isRunning, config } = await response.json();
```

### POST /api/signals/monitor

Управление мониторингом:

```typescript
// Запуск
await fetch('/api/signals/monitor', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'start' }),
});

// Остановка
await fetch('/api/signals/monitor', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'stop' }),
});
```

## React Component

```tsx
import SignalNotifications from '@/components/SignalNotifications';

export default function Page() {
  return <SignalNotifications />;
}
```

## Конфигурация

```typescript
import { SignalNotificationConfig } from './lib/signals/types';

const config: SignalNotificationConfig = {
  monitoringInterval: 10 * 60 * 1000, // 10 минут
  warningCooldown: 30 * 60 * 1000, // 30 минут
  urgentCooldown: 15 * 60 * 1000, // 15 минут
  warningThreshold: 60,
  urgentThreshold: 80,
  maxRetries: 3,
  retryDelay: 5000,
};
```

## Интеграция с Telegram

Система поддерживает отправку уведомлений в Telegram бот.

### Быстрая настройка

1. Создай бота через @BotFather в Telegram
2. Получи Chat ID (отправь `/start` боту, затем запусти `node scripts/get-telegram-chat-id.js`)
3. Добавь в `.env.local`:
```env
TELEGRAM_BOT_TOKEN=твой_токен
TELEGRAM_CHAT_ID=твой_chat_id
```

4. Инициализируй с Telegram:
```typescript
import { signalSystem } from './lib/signals/init';

signalSystem.initialize(
  undefined,
  undefined,
  undefined,
  {
    botToken: process.env.TELEGRAM_BOT_TOKEN!,
    chatId: process.env.TELEGRAM_CHAT_ID!,
  }
);
```

5. Тестирование:
```bash
node scripts/test-telegram-notification.js
```

📖 Подробная инструкция: [TELEGRAM_SETUP.md](./TELEGRAM_SETUP.md)

## Интеграция с реальным API

Для работы с реальными данными нужно реализовать:

### 1. Получение данных рынка

В `signal-monitor.ts`, метод `fetchMarketData()`:

```typescript
private async fetchMarketData(): Promise<MarketData | null> {
  try {
    // Binance API
    const response = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=15m&limit=100`
    );
    const data = await response.json();
    
    const candles = data.map((k: any) => ({
      timestamp: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }));

    return {
      symbol: 'BTCUSDT',
      candles,
      rsiData: calculateRSI(candles), // Ваша функция
    };
  } catch (error) {
    console.error('Ошибка получения данных:', error);
    return null;
  }
}
```

### 2. AI анализ

В `signal-monitor.ts`, метод `performTier2Analysis()`:

```typescript
private async performTier2Analysis(
  tier1: Tier1Analysis,
  marketData: MarketData
): Promise<Tier2Analysis> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Проанализируй торговый сигнал: ${JSON.stringify(tier1)}`,
      }),
    });

    const data = await response.json();

    return {
      confirmed: true,
      explanation: data.response,
    };
  } catch (error) {
    // Fallback
    return {
      confirmed: true,
      explanation: this.generateTemplateExplanation(tier1),
    };
  }
}
```

### 3. Push уведомления

В `signal-monitor.ts`, метод `sendNotification()`:

```typescript
private async sendNotification(notification: any): Promise<void> {
  // Browser Push API
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(`${notification.urgency.toUpperCase()} - ${notification.symbol}`, {
      body: notification.explanation,
      icon: '/icon.png',
      tag: notification.id,
    });
  }

  // WebSocket для in-app уведомлений
  if (this.websocket?.readyState === WebSocket.OPEN) {
    this.websocket.send(JSON.stringify({
      type: 'signal_notification',
      data: notification,
    }));
  }
}
```

## Тестирование

```bash
npm test lib/signals/notification-manager.test.ts
```

## Примеры использования

### Базовая настройка

```typescript
import { LiquidityEngine } from './lib/liquidity/engine';
import { SignalMonitor, NotificationManager } from './lib/signals';
import { DEFAULT_LIQUIDITY_CONFIG } from './lib/liquidity/config';
import { DEFAULT_NOTIFICATION_PREFERENCES } from './lib/signals/config';

// Инициализация
const engine = new LiquidityEngine(DEFAULT_LIQUIDITY_CONFIG);
const notificationManager = new NotificationManager(DEFAULT_NOTIFICATION_PREFERENCES);
const monitor = new SignalMonitor(engine, notificationManager);

// Запуск
monitor.start();
```

### Кастомная конфигурация

```typescript
const customConfig = {
  monitoringInterval: 5 * 60 * 1000, // 5 минут вместо 10
  urgentThreshold: 85, // Более строгий порог
};

const monitor = new SignalMonitor(engine, notificationManager, customConfig);
```

### Фильтрация по preferences

```typescript
const preferences = {
  enableWarning: false, // Только urgent
  enableUrgent: true,
  minScore: 75, // Более высокий минимум
  enablePush: true,
  enableInApp: true,
};

const manager = new NotificationManager(preferences);
```

## Troubleshooting

### Уведомления не приходят

1. Проверьте, запущен ли monitor: `GET /api/signals/monitor`
2. Проверьте preferences: минимальный score, включены ли типы
3. Проверьте cooldown: возможно, недавно было похожее уведомление

### Score всегда низкий

1. Проверьте качество входных данных (достаточно свечей?)
2. Проверьте конфигурацию LiquidityEngine
3. Проверьте, есть ли liquidity sweeps и structure changes

### AI анализ не работает

1. Проверьте endpoint `/api/chat`
2. Проверьте API ключи
3. Система автоматически использует fallback на template-based объяснения

## Roadmap

- [ ] Интеграция с Binance API
- [ ] Реальные push уведомления через Service Worker
- [ ] WebSocket для real-time уведомлений
- [ ] Telegram bot интеграция
- [ ] Email уведомления
- [ ] Мультисимвольный мониторинг
- [ ] Backtesting уведомлений
- [ ] Статистика эффективности сигналов
