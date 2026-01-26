# Настройка Telegram уведомлений

## Шаг 1: Создание бота

1. Открой Telegram и найди бота **@BotFather**
2. Отправь команду `/newbot`
3. Следуй инструкциям:
   - Введи имя бота (например, "Trading Signals Bot")
   - Введи username бота (должен заканчиваться на "bot", например, "my_trading_signals_bot")
4. BotFather даст тебе **токен** - сохрани его!

Пример токена: `8447919474:AAGNiBKj9HXJpzBvNLxOE14iR4mojVjva6w`

## Шаг 2: Получение Chat ID

### Способ 1: Автоматический (рекомендуется)

1. Найди своего бота в Telegram и отправь ему любое сообщение (например, `/start`)

2. Запусти скрипт:
```bash
node scripts/get-telegram-chat-id.js
```

3. Скрипт покажет твой Chat ID

### Способ 2: Через @userinfobot

1. Найди бота **@userinfobot** в Telegram
2. Отправь ему `/start`
3. Он пришлет твой Chat ID

### Способ 3: Вручную через API

Открой в браузере:
```
https://api.telegram.org/bot<ВАШ_ТОКЕН>/getUpdates
```

Найди `"chat":{"id":123456789}` - это твой Chat ID

## Шаг 3: Настройка в приложении

Добавь в `.env.local`:

```env
TELEGRAM_BOT_TOKEN=8447919474:AAGNiBKj9HXJpzBvNLxOE14iR4mojVjva6w
TELEGRAM_CHAT_ID=твой_chat_id
```

## Шаг 4: Инициализация в коде

### Вариант 1: При инициализации системы

```typescript
import { signalSystem } from '@/lib/signals/init';

signalSystem.initialize(
  undefined, // liquidityConfig
  undefined, // notificationPreferences
  undefined, // monitorConfig
  {
    botToken: process.env.TELEGRAM_BOT_TOKEN!,
    chatId: process.env.TELEGRAM_CHAT_ID!,
  }
);
```

### Вариант 2: Через API

```typescript
// Настройка Telegram
await fetch('/api/signals/telegram', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'configure',
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID,
  }),
});

// Проверка подключения
const testConnection = await fetch('/api/signals/telegram', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'test-connection' }),
});

// Отправка тестового сообщения
const testMessage = await fetch('/api/signals/telegram', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'test-message' }),
});
```

### Вариант 3: Динамическая настройка

```typescript
const monitor = signalSystem.getMonitor();

monitor.setTelegramNotifier({
  botToken: 'ваш_токен',
  chatId: 'ваш_chat_id',
});

// Проверка
const connected = await monitor.testTelegramConnection();
console.log('Telegram подключен:', connected);

// Тестовое сообщение
const sent = await monitor.sendTelegramTest();
console.log('Тест отправлен:', sent);
```

## Шаг 5: Тестирование

### Через API endpoint

```bash
# Настройка
curl -X POST http://localhost:3000/api/signals/telegram \
  -H "Content-Type: application/json" \
  -d '{
    "action": "configure",
    "botToken": "ваш_токен",
    "chatId": "ваш_chat_id"
  }'

# Проверка подключения
curl -X POST http://localhost:3000/api/signals/telegram \
  -H "Content-Type: application/json" \
  -d '{"action": "test-connection"}'

# Тестовое сообщение
curl -X POST http://localhost:3000/api/signals/telegram \
  -H "Content-Type: application/json" \
  -d '{"action": "test-message"}'
```

### Через код

```typescript
import { TelegramNotifier } from '@/lib/signals/telegram-notifier';

const notifier = new TelegramNotifier({
  botToken: process.env.TELEGRAM_BOT_TOKEN!,
  chatId: process.env.TELEGRAM_CHAT_ID!,
});

// Проверка подключения
const connected = await notifier.checkConnection();
console.log('Подключено:', connected);

// Тестовое сообщение
const sent = await notifier.sendTestMessage();
console.log('Отправлено:', sent);
```

## Формат уведомлений

Уведомления приходят в таком формате:

```
🚨 URGENT СИГНАЛ

🟢 BUY BTCUSDT
📊 Score: 85.5/100

💡 Обнаружен сигнал на покупку BTCUSDT. Liquidity Sweep на 50000.00 (фитиль 65%). CHOCH вверх. Подтверждение объёмом.

🕐 26.01.2026, 01:45 (МСК)
```

### Эмодзи

- 🚨 - Urgent сигнал (score >= 80)
- ⚠️ - Warning сигнал (score 60-79)
- 🟢 - BUY сигнал
- 🔴 - SELL сигнал
- 📊 - Score
- 💡 - Объяснение
- 🕐 - Время

## Troubleshooting

### Ошибка: "Unauthorized"

- Проверь правильность токена
- Убедись что токен не содержит лишних пробелов

### Ошибка: "Bad Request: chat not found"

- Проверь правильность Chat ID
- Убедись что ты отправил хотя бы одно сообщение боту
- Chat ID должен быть числом (без кавычек в .env)

### Сообщения не приходят

1. Проверь что бот запущен:
```typescript
const monitor = signalSystem.getMonitor();
console.log('Running:', monitor.isActive());
```

2. Проверь Telegram настройки:
```typescript
const connected = await monitor.testTelegramConnection();
console.log('Connected:', connected);
```

3. Проверь логи:
```bash
# В консоли должны быть сообщения:
# ✓ Telegram notifier установлен
# ✓ Уведомление отправлено в Telegram
```

### Тестирование без реального мониторинга

```typescript
import { TelegramNotifier } from '@/lib/signals/telegram-notifier';

const notifier = new TelegramNotifier({
  botToken: process.env.TELEGRAM_BOT_TOKEN!,
  chatId: process.env.TELEGRAM_CHAT_ID!,
});

// Создать тестовое уведомление
const testNotification = {
  id: 'test-1',
  signalId: 'signal-1',
  symbol: 'BTCUSDT',
  direction: 'BUY' as const,
  urgency: 'urgent' as const,
  score: 85.5,
  explanation: 'Тестовый сигнал для проверки Telegram',
  type: 'push' as const,
  status: 'pending' as const,
  timestamp: Date.now(),
};

// Отправить
await notifier.sendSignalNotification(testNotification);
```

## Безопасность

⚠️ **Важно:**

1. **Никогда не коммить** `.env.local` в git
2. Храни токен в безопасности
3. Не делись токеном с другими
4. Если токен скомпрометирован, создай нового бота через @BotFather

## Дополнительные возможности

### Отправка в группу

1. Создай группу в Telegram
2. Добавь бота в группу
3. Сделай бота администратором
4. Получи Chat ID группы (будет отрицательным числом)
5. Используй этот Chat ID в настройках

### Отправка в канал

1. Создай канал в Telegram
2. Добавь бота как администратора канала
3. Получи Chat ID канала (начинается с `-100`)
4. Используй этот Chat ID в настройках

### Кастомизация сообщений

Отредактируй метод `formatSignalMessage` в `telegram-notifier.ts`:

```typescript
private formatSignalMessage(notification: SignalNotification): string {
  // Твой кастомный формат
  return `
🎯 ${notification.direction} ${notification.symbol}
Score: ${notification.score}
${notification.explanation}
  `.trim();
}
```

## Полезные ссылки

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [BotFather](https://t.me/BotFather)
- [userinfobot](https://t.me/userinfobot)
- [Документация по форматированию](https://core.telegram.org/bots/api#html-style)
