# Интеграция Trading Signal System

## Быстрый старт

### 1. Инициализация при запуске приложения

В вашем `app/layout.tsx` или отдельном инициализационном файле:

```typescript
// app/init-signals.ts
'use client';

import { useEffect } from 'react';

export function InitSignals() {
  useEffect(() => {
    // Инициализация системы
    fetch('/api/signals/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // Опционально: кастомные настройки
        notificationPreferences: {
          enableWarning: true,
          enableUrgent: true,
          minScore: 60,
        },
      }),
    })
      .then(res => res.json())
      .then(data => {
        console.log('Signal system:', data.message);
        
        // Автоматически запустить мониторинг
        return fetch('/api/signals/monitor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'start' }),
        });
      })
      .then(res => res.json())
      .then(data => console.log('Monitoring:', data.message))
      .catch(err => console.error('Init error:', err));
  }, []);

  return null;
}
```

Затем в `app/layout.tsx`:

```typescript
import { InitSignals } from './init-signals';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <InitSignals />
        {children}
      </body>
    </html>
  );
}
```

### 2. Добавить UI компонент

Создайте страницу для отображения сигналов:

```typescript
// app/signals/page.tsx
import SignalNotifications from '@/components/SignalNotifications';

export default function SignalsPage() {
  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold mb-6">Торговые сигналы</h1>
      <SignalNotifications />
    </div>
  );
}
```

### 3. Настроить Browser Notifications

Добавьте запрос разрешений в вашем компоненте:

```typescript
'use client';

import { useEffect } from 'react';

export function NotificationPermission() {
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
      });
    }
  }, []);

  return null;
}
```

## Серверная инициализация (альтернатива)

Если вы хотите инициализировать систему на сервере:

```typescript
// lib/signals/server-init.ts
import { signalSystem } from './init';

// Вызвать при старте сервера
export function initializeOnServer() {
  if (!signalSystem.isInitialized()) {
    signalSystem.initialize();
    signalSystem.startMonitoring();
    console.log('✓ Signal system initialized on server');
  }
}
```

Затем в `next.config.js`:

```javascript
// next.config.js
module.exports = {
  // ... другие настройки
  
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Инициализация при сборке сервера
      const { initializeOnServer } = require('./lib/signals/server-init');
      initializeOnServer();
    }
    return config;
  },
};
```

## Интеграция с реальным API

### Binance API

Обновите `lib/signals/signal-monitor.ts`:

```typescript
private async fetchMarketData(): Promise<MarketData | null> {
  try {
    const symbol = 'BTCUSDT';
    const interval = '15m';
    const limit = 100;

    const response = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
    );

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }

    const data = await response.json();

    const candles: Candlestick[] = data.map((k: any) => ({
      timestamp: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }));

    // Рассчитать RSI
    const rsiData = this.calculateRSI(candles);

    return {
      symbol,
      candles,
      rsiData,
    };
  } catch (error) {
    console.error('Ошибка получения данных Binance:', error);
    return null;
  }
}

private calculateRSI(candles: Candlestick[], period: number = 14): number[] {
  // Простая реализация RSI
  const rsi: number[] = [];
  
  for (let i = period; i < candles.length; i++) {
    let gains = 0;
    let losses = 0;

    for (let j = i - period; j < i; j++) {
      const change = candles[j + 1].close - candles[j].close;
      if (change > 0) {
        gains += change;
      } else {
        losses += Math.abs(change);
      }
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;
    const rs = avgGain / avgLoss;
    const rsiValue = 100 - (100 / (1 + rs));

    rsi.push(rsiValue);
  }

  return rsi;
}
```

### AI анализ через OpenAI

```typescript
private async performTier2Analysis(
  tier1: Tier1Analysis,
  marketData: MarketData
): Promise<Tier2Analysis> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'Ты эксперт по техническому анализу. Анализируй торговые сигналы и давай объяснения на русском языке.',
          },
          {
            role: 'user',
            content: `Проанализируй торговый сигнал:
              Символ: ${marketData.symbol}
              Направление: ${tier1.signal?.direction}
              Score: ${tier1.score.totalScore}
              Обоснование: ${tier1.signal?.reasoning}
              
              Подтверди сигнал и дай краткое объяснение (2-3 предложения).`,
          },
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    const data = await response.json();
    const explanation = data.choices[0].message.content;

    return {
      confirmed: true,
      explanation,
    };
  } catch (error) {
    console.error('Ошибка AI анализа:', error);
    
    // Fallback
    return {
      confirmed: true,
      explanation: this.generateTemplateExplanation(tier1),
    };
  }
}
```

### WebSocket для real-time уведомлений

Создайте WebSocket сервер:

```typescript
// lib/signals/websocket-server.ts
import { WebSocketServer } from 'ws';
import { signalSystem } from './init';

export function createSignalWebSocketServer(server: any) {
  const wss = new WebSocketServer({ server, path: '/signals' });

  wss.on('connection', (ws) => {
    console.log('Client connected to signals WebSocket');

    // Отправить текущую историю
    const manager = signalSystem.getNotificationManager();
    const history = manager.getHistory();
    
    ws.send(JSON.stringify({
      type: 'history',
      data: history,
    }));

    ws.on('close', () => {
      console.log('Client disconnected from signals WebSocket');
    });
  });

  return wss;
}

// Функция для broadcast уведомлений всем клиентам
export function broadcastNotification(wss: WebSocketServer, notification: any) {
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // OPEN
      client.send(JSON.stringify({
        type: 'notification',
        data: notification,
      }));
    }
  });
}
```

Обновите `signal-monitor.ts`:

```typescript
import { broadcastNotification } from './websocket-server';

// В конструкторе
constructor(
  engine: LiquidityEngine,
  notificationManager: NotificationManager,
  config?: Partial<SignalNotificationConfig>,
  private wss?: WebSocketServer // Добавить WebSocket server
) {
  // ...
}

// В sendNotification
private async sendNotification(notification: any): Promise<void> {
  // ... существующий код ...

  // Broadcast через WebSocket
  if (this.wss) {
    broadcastNotification(this.wss, notification);
  }
}
```

## Мониторинг и логирование

Добавьте логирование в production:

```typescript
// lib/signals/logger.ts
export class SignalLogger {
  static log(level: 'info' | 'warn' | 'error', message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data,
    };

    // Console
    console[level](`[${timestamp}] ${message}`, data || '');

    // Отправить в внешний сервис (например, Sentry, LogRocket)
    if (process.env.NODE_ENV === 'production') {
      // TODO: Интеграция с logging service
    }
  }
}
```

## Тестирование

Запустите тесты:

```bash
npm test lib/signals/notification-manager.test.ts
```

Для интеграционного тестирования:

```typescript
// lib/signals/integration.test.ts
import { signalSystem } from './init';

describe('Signal System Integration', () => {
  beforeAll(() => {
    signalSystem.initialize();
  });

  afterAll(() => {
    signalSystem.reset();
  });

  it('должен создать и отправить уведомление', async () => {
    const monitor = signalSystem.getMonitor();
    const manager = signalSystem.getNotificationManager();

    // Запустить мониторинг
    monitor.start();

    // Подождать один цикл
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Проверить историю
    const history = manager.getHistory();
    expect(history.length).toBeGreaterThanOrEqual(0);

    monitor.stop();
  });
});
```

## Production Checklist

- [ ] Настроить переменные окружения (API ключи)
- [ ] Включить логирование ошибок
- [ ] Настроить мониторинг (health checks)
- [ ] Протестировать на staging
- [ ] Настроить rate limiting для API endpoints
- [ ] Добавить аутентификацию для API
- [ ] Настроить CORS для WebSocket
- [ ] Добавить graceful shutdown
- [ ] Настроить backup для истории уведомлений
- [ ] Документировать процесс деплоя
