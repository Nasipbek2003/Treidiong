/**
 * Tests for NotificationManager
 */

import { NotificationManager } from './notification-manager';
import { TradingSignal } from '../liquidity/types';
import { DEFAULT_NOTIFICATION_PREFERENCES } from './config';

describe('NotificationManager', () => {
  let manager: NotificationManager;

  beforeEach(() => {
    manager = new NotificationManager(DEFAULT_NOTIFICATION_PREFERENCES);
  });

  describe('createNotification', () => {
    it('должен создать уведомление для валидного сигнала', () => {
      const signal: TradingSignal = {
        id: 'test-1',
        symbol: 'BTCUSDT',
        direction: 'BUY',
        score: {
          totalScore: 75,
          breakdown: {
            sweepScore: 20,
            bosScore: 25,
            divergenceScore: 10,
            volumeScore: 10,
            htfScore: 10,
          },
          components: [],
        },
        timestamp: Date.now(),
        entryPrice: 50000,
        stopLoss: 49000,
        takeProfit: 52000,
        reasoning: 'Test signal',
      };

      const notification = manager.createNotification(
        signal,
        'Тестовое объяснение',
        'warning'
      );

      expect(notification).not.toBeNull();
      expect(notification?.symbol).toBe('BTCUSDT');
      expect(notification?.direction).toBe('BUY');
      expect(notification?.urgency).toBe('warning');
    });

    it('не должен создать уведомление если score ниже минимума', () => {
      const signal: TradingSignal = {
        id: 'test-2',
        symbol: 'BTCUSDT',
        direction: 'BUY',
        score: {
          totalScore: 50, // Ниже минимума (60)
          breakdown: {
            sweepScore: 10,
            bosScore: 15,
            divergenceScore: 10,
            volumeScore: 10,
            htfScore: 5,
          },
          components: [],
        },
        timestamp: Date.now(),
        entryPrice: 50000,
        stopLoss: 49000,
        takeProfit: 52000,
        reasoning: 'Test signal',
      };

      const notification = manager.createNotification(
        signal,
        'Тестовое объяснение',
        'warning'
      );

      expect(notification).toBeNull();
    });

    it('не должен создать дубликат в cooldown периоде', () => {
      const signal: TradingSignal = {
        id: 'test-3',
        symbol: 'BTCUSDT',
        direction: 'BUY',
        score: {
          totalScore: 75,
          breakdown: {
            sweepScore: 20,
            bosScore: 25,
            divergenceScore: 10,
            volumeScore: 10,
            htfScore: 10,
          },
          components: [],
        },
        timestamp: Date.now(),
        entryPrice: 50000,
        stopLoss: 49000,
        takeProfit: 52000,
        reasoning: 'Test signal',
      };

      // Первое уведомление
      const first = manager.createNotification(signal, 'Первое', 'warning');
      expect(first).not.toBeNull();

      // Второе уведомление (должно быть заблокировано)
      const second = manager.createNotification(signal, 'Второе', 'warning');
      expect(second).toBeNull();
    });
  });

  describe('markAsSent', () => {
    it('должен отметить уведомление как отправленное', () => {
      const signal: TradingSignal = {
        id: 'test-4',
        symbol: 'BTCUSDT',
        direction: 'BUY',
        score: {
          totalScore: 75,
          breakdown: {
            sweepScore: 20,
            bosScore: 25,
            divergenceScore: 10,
            volumeScore: 10,
            htfScore: 10,
          },
          components: [],
        },
        timestamp: Date.now(),
        entryPrice: 50000,
        stopLoss: 49000,
        takeProfit: 52000,
        reasoning: 'Test signal',
      };

      const notification = manager.createNotification(signal, 'Test', 'warning');
      expect(notification?.status).toBe('pending');

      manager.markAsSent(notification!.id);

      const history = manager.getHistory();
      const updated = history.find(n => n.id === notification!.id);
      expect(updated?.status).toBe('sent');
      expect(updated?.sentAt).toBeDefined();
    });
  });

  describe('dismiss', () => {
    it('должен отметить уведомление как отклоненное', () => {
      const signal: TradingSignal = {
        id: 'test-5',
        symbol: 'BTCUSDT',
        direction: 'BUY',
        score: {
          totalScore: 75,
          breakdown: {
            sweepScore: 20,
            bosScore: 25,
            divergenceScore: 10,
            volumeScore: 10,
            htfScore: 10,
          },
          components: [],
        },
        timestamp: Date.now(),
        entryPrice: 50000,
        stopLoss: 49000,
        takeProfit: 52000,
        reasoning: 'Test signal',
      };

      const notification = manager.createNotification(signal, 'Test', 'warning');
      manager.dismiss(notification!.id);

      const history = manager.getHistory();
      const updated = history.find(n => n.id === notification!.id);
      expect(updated?.status).toBe('dismissed');
      expect(updated?.dismissedAt).toBeDefined();
    });
  });

  describe('getHistory', () => {
    it('должен вернуть историю в обратном хронологическом порядке', async () => {
      const signal1: TradingSignal = {
        id: 'test-6',
        symbol: 'BTCUSDT',
        direction: 'BUY',
        score: {
          totalScore: 75,
          breakdown: {
            sweepScore: 20,
            bosScore: 25,
            divergenceScore: 10,
            volumeScore: 10,
            htfScore: 10,
          },
          components: [],
        },
        timestamp: Date.now(),
        entryPrice: 50000,
        stopLoss: 49000,
        takeProfit: 52000,
        reasoning: 'Test signal 1',
      };

      const signal2: TradingSignal = {
        ...signal1,
        id: 'test-7',
        symbol: 'ETHUSDT',
        reasoning: 'Test signal 2',
      };

      manager.createNotification(signal1, 'First', 'warning');
      
      // Небольшая задержка для разных timestamp
      await new Promise(resolve => setTimeout(resolve, 10));
      
      manager.createNotification(signal2, 'Second', 'urgent');

      const history = manager.getHistory();
      expect(history.length).toBe(2);
      expect(history[0].symbol).toBe('ETHUSDT'); // Последнее первым
    });
  });

  describe('updatePreferences', () => {
    it('должен обновить preferences', () => {
      manager.updatePreferences({ minScore: 70 });
      
      const signal: TradingSignal = {
        id: 'test-8',
        symbol: 'BTCUSDT',
        direction: 'BUY',
        score: {
          totalScore: 65, // Ниже нового минимума
          breakdown: {
            sweepScore: 15,
            bosScore: 20,
            divergenceScore: 10,
            volumeScore: 10,
            htfScore: 10,
          },
          components: [],
        },
        timestamp: Date.now(),
        entryPrice: 50000,
        stopLoss: 49000,
        takeProfit: 52000,
        reasoning: 'Test signal',
      };

      const notification = manager.createNotification(signal, 'Test', 'warning');
      expect(notification).toBeNull(); // Заблокировано новым минимумом
    });
  });
});
