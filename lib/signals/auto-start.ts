/**
 * Автоматический запуск системы торговых сигналов
 */

import { signalSystem } from './init';
import { TelegramBot } from './telegram-bot';
import { TelegramPollingService } from './telegram-polling';

let pollingService: TelegramPollingService | null = null;

export async function autoStartSignalSystem() {
  try {
    console.log('🚀 Автозапуск системы торговых сигналов...');

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      console.warn('⚠️  Telegram не настроен (нет TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID)');
      console.log('Система запущена без Telegram уведомлений');
      
      signalSystem.initialize();
      signalSystem.startMonitoring();
      return;
    }

    // Инициализация с Telegram
    signalSystem.initialize(
      undefined,
      {
        enableWarning: true,
        enableUrgent: true,
        minScore: 60,
        enablePush: true,
        enableInApp: true,
        activeSymbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'],
      },
      {
        monitoringInterval: 10 * 60 * 1000, // 10 минут
      },
      {
        botToken,
        chatId,
      }
    );

    console.log('✅ Система инициализирована');

    // Проверка Telegram
    const monitor = signalSystem.getMonitor();
    const connected = await monitor.testTelegramConnection();

    if (connected) {
      console.log('✅ Telegram подключен');
    } else {
      console.warn('⚠️  Telegram не подключен');
    }

    // Запуск Telegram бота с polling
    const manager = signalSystem.getNotificationManager();
    const activeSymbols = manager['preferences'].activeSymbols || [];

    const telegramBot = new TelegramBot(
      { botToken, chatId },
      activeSymbols
    );

    // Создаем polling service
    pollingService = new TelegramPollingService(
      telegramBot,
      (newSymbols) => {
        // Обновляем подписки в NotificationManager
        manager.updatePreferences({ activeSymbols: newSymbols });
        console.log('📊 Подписки обновлены:', newSymbols.join(', '));
      }
    );

    // Запускаем polling
    pollingService.start();

    // Отправляем приветственное сообщение
    await telegramBot.sendMessage(
      '🤖 <b>Бот запущен!</b>\n\nОтправь /help чтобы увидеть доступные команды.'
    );

    // Запуск мониторинга
    signalSystem.startMonitoring();
    console.log('✅ Мониторинг запущен');
    console.log('📊 Интервал: 10 минут');
    console.log('📱 Уведомления: Telegram');
    console.log('🤖 Бот: готов принимать команды\n');

  } catch (error) {
    console.error('❌ Ошибка запуска:', error);
    throw error;
  }
}

export function stopPolling() {
  if (pollingService) {
    pollingService.stop();
  }
}
