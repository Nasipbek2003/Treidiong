# 🚀 Быстрый старт - Торговые сигналы с Telegram

## ✅ Что уже настроено

- ✅ Telegram Bot: @My_SignalPro_bot
- ✅ Bot Token: `8447919474:AAGNiBKj9HXJpzBvNLxOE14iR4mojVjva6w`
- ✅ Chat ID: `6254307002`
- ✅ Тесты пройдены успешно

## 🎯 Запуск за 3 шага

### Шаг 1: Проверь настройки

Убедись что в `.env.local` есть:

```env
TELEGRAM_BOT_TOKEN=8447919474:AAGNiBKj9HXJpzBvNLxOE14iR4mojVjva6w
TELEGRAM_CHAT_ID=6254307002
```

### Шаг 2: Тестирование

```bash
# Проверка Telegram
node scripts/test-telegram-notification.js

# Должны прийти 2 сообщения в Telegram
```

### Шаг 3: Запуск системы

#### Вариант A: Через код

```typescript
import { signalSystem } from '@/lib/signals/init';

// Инициализация с Telegram
signalSystem.initialize(
  undefined, // liquidityConfig
  undefined, // notificationPreferences
  undefined, // monitorConfig
  {
    botToken: process.env.TELEGRAM_BOT_TOKEN!,
    chatId: process.env.TELEGRAM_CHAT_ID!,
  }
);

// Запуск мониторинга
signalSystem.startMonitoring();

console.log('✅ Система запущена!');
```

#### Вариант B: Через API

```bash
# 1. Запусти сервер
npm run dev

# 2. Инициализация
curl -X POST http://localhost:3000/api/signals/init \
  -H "Content-Type: application/json" \
  -d '{
    "telegramConfig": {
      "botToken": "8447919474:AAGNiBKj9HXJpzBvNLxOE14iR4mojVjva6w",
      "chatId": "6254307002"
    }
  }'

# 3. Запуск мониторинга
curl -X POST http://localhost:3000/api/signals/monitor \
  -H "Content-Type: application/json" \
  -d '{"action": "start"}'

# 4. Проверка статуса
curl http://localhost:3000/api/signals/monitor
```

## 📱 Что будет происходить

Каждые **10 минут** система:

1. Получает данные рынка
2. Анализирует через LiquidityEngine (Tier 1)
3. Если score >= 60, запускает AI анализ (Tier 2)
4. Если подтверждено, отправляет уведомление в Telegram

### Пример уведомления

```
🚨 URGENT СИГНАЛ

🟢 BUY BTCUSDT
📊 Score: 85.5/100

💡 Обнаружен сигнал на покупку BTCUSDT. 
Liquidity Sweep на 50000.00 (фитиль 65%). 
CHOCH вверх. Подтверждение объёмом.

🕐 26.01.2026, 01:45 (МСК)
```

## 🎨 UI Компоненты

### Страница с настройками

```typescript
// app/signals/page.tsx
import SignalNotifications from '@/components/SignalNotifications';
import TelegramSettings from '@/components/TelegramSettings';

export default function SignalsPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Торговые сигналы</h1>
      
      <TelegramSettings />
      <SignalNotifications />
    </div>
  );
}
```

## 🔧 Настройка параметров

### Изменить интервал мониторинга

```typescript
signalSystem.initialize(
  undefined,
  undefined,
  {
    monitoringInterval: 5 * 60 * 1000, // 5 минут вместо 10
  },
  telegramConfig
);
```

### Изменить пороги срочности

```typescript
signalSystem.initialize(
  undefined,
  undefined,
  {
    warningThreshold: 70, // Вместо 60
    urgentThreshold: 85,  // Вместо 80
  },
  telegramConfig
);
```

### Фильтрация уведомлений

```typescript
signalSystem.initialize(
  undefined,
  {
    enableWarning: false, // Только urgent
    enableUrgent: true,
    minScore: 75, // Минимум 75
  },
  undefined,
  telegramConfig
);
```

## 📊 Мониторинг

### Проверка статуса

```bash
curl http://localhost:3000/api/signals/monitor
```

Ответ:
```json
{
  "isRunning": true,
  "config": {
    "monitoringInterval": 600000,
    "warningThreshold": 60,
    "urgentThreshold": 80
  }
}
```

### История уведомлений

```bash
curl http://localhost:3000/api/signals/history
```

### Остановка мониторинга

```bash
curl -X POST http://localhost:3000/api/signals/monitor \
  -H "Content-Type: application/json" \
  -d '{"action": "stop"}'
```

## 🧪 Тестирование

### Отправить тестовый сигнал

```bash
node scripts/start-signal-monitor.js
```

### Проверить Telegram подключение

```typescript
const monitor = signalSystem.getMonitor();

// Проверка подключения
const connected = await monitor.testTelegramConnection();
console.log('Connected:', connected);

// Тестовое сообщение
const sent = await monitor.sendTelegramTest();
console.log('Sent:', sent);
```

## 🔥 Полный пример

```typescript
// lib/signals/start.ts
import { signalSystem } from './init';

async function startTradingSignals() {
  console.log('🚀 Запуск системы торговых сигналов...\n');

  // 1. Инициализация
  signalSystem.initialize(
    undefined,
    {
      enableWarning: true,
      enableUrgent: true,
      minScore: 60,
    },
    {
      monitoringInterval: 10 * 60 * 1000,
    },
    {
      botToken: process.env.TELEGRAM_BOT_TOKEN!,
      chatId: process.env.TELEGRAM_CHAT_ID!,
    }
  );

  console.log('✅ Система инициализирована');

  // 2. Проверка Telegram
  const monitor = signalSystem.getMonitor();
  const connected = await monitor.testTelegramConnection();

  if (!connected) {
    console.error('❌ Ошибка подключения к Telegram');
    return;
  }

  console.log('✅ Telegram подключен');

  // 3. Тестовое сообщение
  await monitor.sendTelegramTest();
  console.log('✅ Тестовое сообщение отправлено');

  // 4. Запуск мониторинга
  signalSystem.startMonitoring();
  console.log('✅ Мониторинг запущен');

  console.log('\n📊 Система работает!');
  console.log('📱 Уведомления будут приходить в Telegram');
  console.log('⏱️  Интервал: 10 минут\n');
}

// Запуск
startTradingSignals().catch(console.error);
```

## 📚 Дополнительная документация

- [README.md](./README.md) - Полная документация
- [TELEGRAM_SETUP.md](./TELEGRAM_SETUP.md) - Детальная настройка Telegram
- [INTEGRATION.md](./INTEGRATION.md) - Интеграция с реальными API
- [SUMMARY.md](./SUMMARY.md) - Обзор системы

## 🆘 Проблемы?

### Уведомления не приходят

1. Проверь что мониторинг запущен:
```bash
curl http://localhost:3000/api/signals/monitor
```

2. Проверь Telegram:
```bash
node scripts/test-telegram-notification.js
```

3. Проверь логи в консоли

### Ошибка "Unauthorized"

- Проверь Bot Token в `.env.local`
- Убедись что токен правильный

### Ошибка "Chat not found"

- Проверь Chat ID в `.env.local`
- Отправь `/start` боту в Telegram
- Запусти `node scripts/get-telegram-chat-id.js` снова

## 🎉 Готово!

Система настроена и готова к работе. Уведомления будут автоматически приходить в твой Telegram при обнаружении торговых сигналов!
