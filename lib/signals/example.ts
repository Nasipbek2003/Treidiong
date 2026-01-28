/**
 * Пример использования Trading Signal Notification System
 */

import { LiquidityEngine } from '../liquidity/engine';
import { SignalMonitor } from './signal-monitor';
import { NotificationManager } from './notification-manager';
import { DEFAULT_CONFIG } from '../liquidity/config';
import { DEFAULT_NOTIFICATION_PREFERENCES } from './config';

/**
 * Базовый пример - запуск мониторинга
 */
export function basicExample() {
  // 1. Создаем LiquidityEngine
  const engine = new LiquidityEngine(DEFAULT_CONFIG);

  // 2. Создаем NotificationManager
  const notificationManager = new NotificationManager(DEFAULT_NOTIFICATION_PREFERENCES);

  // 3. Создаем SignalMonitor
  const monitor = new SignalMonitor(engine, notificationManager);

  // 4. Запускаем мониторинг
  monitor.start();

  console.log('✓ Мониторинг запущен');

  // Остановка через 1 час
  setTimeout(() => {
    monitor.stop();
    console.log('✓ Мониторинг остановлен');
  }, 60 * 60 * 1000);
}

/**
 * Пример с кастомной конфигурацией
 */
export function customConfigExample() {
  const engine = new LiquidityEngine(DEFAULT_CONFIG);

  // Кастомные preferences
  const preferences = {
    enableWarning: false, // Только urgent сигналы
    enableUrgent: true,
    minScore: 80, // Высокий порог
    enablePush: true,
    enableInApp: true,
    activeSymbols: ['XAUUSD', 'BTCUSD'], // Добавляем обязательное поле
  };

  const notificationManager = new NotificationManager(preferences);

  // Кастомная конфигурация монитора
  const customConfig = {
    monitoringInterval: 5 * 60 * 1000, // 5 минут
    warningCooldown: 20 * 60 * 1000, // 20 минут
    urgentCooldown: 10 * 60 * 1000, // 10 минут
    warningThreshold: 70,
    urgentThreshold: 85,
    maxRetries: 5,
    retryDelay: 3000,
  };

  const monitor = new SignalMonitor(engine, notificationManager, customConfig);
  monitor.start();

  console.log('✓ Мониторинг с кастомной конфигурацией запущен');
}

/**
 * Пример работы с историей уведомлений
 */
export function historyExample() {
  const notificationManager = new NotificationManager(DEFAULT_NOTIFICATION_PREFERENCES);

  // Получить всю историю
  const allHistory = notificationManager.getHistory();
  console.log(`Всего уведомлений: ${allHistory.length}`);

  // Получить историю за последние 24 часа
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const recentHistory = notificationManager.getHistory(oneDayAgo);
  console.log(`За последние 24 часа: ${recentHistory.length}`);

  // Получить pending уведомления
  const pending = notificationManager.getPendingNotifications();
  console.log(`Ожидают отправки: ${pending.length}`);

  // Отклонить уведомление
  if (pending.length > 0) {
    notificationManager.dismiss(pending[0].id);
    console.log('✓ Уведомление отклонено');
  }
}

/**
 * Пример динамического изменения preferences
 */
export function dynamicPreferencesExample() {
  const notificationManager = new NotificationManager(DEFAULT_NOTIFICATION_PREFERENCES);

  // Изменить preferences во время работы
  notificationManager.updatePreferences({
    minScore: 75,
    enableWarning: false,
  });

  console.log('✓ Preferences обновлены');

  // Теперь будут приходить только urgent сигналы с score >= 75
}

/**
 * Пример очистки старых данных
 */
export function cleanupExample() {
  const notificationManager = new NotificationManager(DEFAULT_NOTIFICATION_PREFERENCES);

  // Очистить уведомления старше 90 дней
  notificationManager.cleanup();

  console.log('✓ Старые уведомления удалены');
}

/**
 * Пример интеграции с React
 */
export function reactIntegrationExample() {
  // В вашем React компоненте:
  
  const code = `
import { useEffect, useState } from 'react';

export function useSignalNotifications() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Загрузить историю
    fetch('/api/signals/history')
      .then(res => res.json())
      .then(data => setNotifications(data.history));

    // WebSocket для real-time обновлений
    const ws = new WebSocket('ws://localhost:3000/signals');
    
    ws.onmessage = (event) => {
      const notification = JSON.parse(event.data);
      setNotifications(prev => [notification, ...prev]);
      
      // Показать browser notification
      if (Notification.permission === 'granted') {
        new Notification(\`\${notification.urgency.toUpperCase()} - \${notification.symbol}\`, {
          body: notification.explanation,
        });
      }
    };

    return () => ws.close();
  }, []);

  const dismissNotification = async (id) => {
    await fetch('/api/signals/dismiss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId: id }),
    });
    
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, status: 'dismissed' } : n)
    );
  };

  return { notifications, dismissNotification };
}
  `;

  console.log('React integration example:');
  console.log(code);
}

/**
 * Пример тестирования системы
 */
export async function testSystemExample() {
  const engine = new LiquidityEngine(DEFAULT_CONFIG);
  const notificationManager = new NotificationManager(DEFAULT_NOTIFICATION_PREFERENCES);
  const monitor = new SignalMonitor(engine, notificationManager);

  // Запустить на короткое время для теста
  monitor.start();

  console.log('✓ Тестовый мониторинг запущен на 1 минуту');

  // Остановить через 1 минуту
  setTimeout(() => {
    monitor.stop();
    
    // Проверить результаты
    const history = notificationManager.getHistory();
    console.log(`\n=== Результаты теста ===`);
    console.log(`Создано уведомлений: ${history.length}`);
    
    history.forEach(n => {
      console.log(`- ${n.symbol} ${n.direction} (${n.urgency}) - Score: ${n.score.toFixed(1)}`);
    });
  }, 60 * 1000);
}

// Экспорт для использования
if (require.main === module) {
  console.log('=== Trading Signal Notification System Examples ===\n');
  
  // Раскомментируйте нужный пример:
  
  // basicExample();
  // customConfigExample();
  // historyExample();
  // dynamicPreferencesExample();
  // cleanupExample();
  // reactIntegrationExample();
  // testSystemExample();
}
