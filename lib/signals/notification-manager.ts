/**
 * NotificationManager - Управление уведомлениями
 * 
 * Отвечает за:
 * - Создание уведомлений
 * - Проверку cooldown
 * - Отправку через разные каналы
 * - Хранение истории
 */

import {
  SignalNotification,
  NotificationPreferences,
  NotificationCooldown,
  SignalUrgency,
  NotificationStatus,
  NotificationType,
} from './types';
import { TradingSignal } from '../liquidity/types';
import { DEFAULT_SIGNAL_CONFIG } from './config';

function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class NotificationManager {
  private notifications: SignalNotification[] = [];
  private cooldowns: Map<string, NotificationCooldown> = new Map();
  private preferences: NotificationPreferences;

  constructor(preferences: NotificationPreferences) {
    this.preferences = preferences;
  }

  /**
   * Создать уведомление из торгового сигнала
   */
  createNotification(
    signal: TradingSignal,
    explanation: string,
    urgency: SignalUrgency
  ): SignalNotification | null {
    // Проверка preferences (включая символ)
    if (!this.shouldNotify(signal.score.totalScore, urgency, signal.symbol)) {
      return null;
    }

    // Проверка cooldown
    if (this.isInCooldown(signal.symbol, signal.direction, urgency)) {
      return null;
    }

    const notification: SignalNotification = {
      id: uuidv4(),
      signalId: signal.id,
      symbol: signal.symbol,
      direction: signal.direction,
      urgency,
      score: signal.score.totalScore,
      explanation,
      type: this.preferences.enablePush ? 'push' : 'in_app',
      status: 'pending',
      timestamp: Date.now(),
    };

    this.notifications.push(notification);
    this.setCooldown(signal.symbol, signal.direction, urgency);

    return notification;
  }

  /**
   * Проверка, нужно ли отправлять уведомление
   */
  private shouldNotify(score: number, urgency: SignalUrgency, symbol?: string): boolean {
    // Проверка минимального score
    if (score < this.preferences.minScore) {
      return false;
    }

    // Проверка типа уведомления
    if (urgency === 'warning' && !this.preferences.enableWarning) {
      return false;
    }

    if (urgency === 'urgent' && !this.preferences.enableUrgent) {
      return false;
    }

    // Проверка активных символов
    if (symbol && this.preferences.activeSymbols) {
      if (!this.preferences.activeSymbols.includes(symbol)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Проверка cooldown
   */
  private isInCooldown(symbol: string, direction: 'BUY' | 'SELL', urgency: SignalUrgency): boolean {
    const key = `${symbol}_${direction}`;
    const cooldown = this.cooldowns.get(key);

    if (!cooldown) {
      return false;
    }

    const now = Date.now();
    const elapsed = now - cooldown.lastNotificationTime;

    return elapsed < cooldown.cooldownDuration;
  }

  /**
   * Установить cooldown
   */
  private setCooldown(symbol: string, direction: 'BUY' | 'SELL', urgency: SignalUrgency): void {
    const key = `${symbol}_${direction}`;
    const duration =
      urgency === 'urgent'
        ? DEFAULT_SIGNAL_CONFIG.urgentCooldown
        : DEFAULT_SIGNAL_CONFIG.warningCooldown;

    this.cooldowns.set(key, {
      symbol,
      direction,
      lastNotificationTime: Date.now(),
      cooldownDuration: duration,
    });
  }

  /**
   * Отметить уведомление как отправленное
   */
  markAsSent(notificationId: string): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.status = 'sent';
      notification.sentAt = Date.now();
    }
  }

  /**
   * Отметить уведомление как проваленное
   */
  markAsFailed(notificationId: string): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.status = 'failed';
    }
  }

  /**
   * Отметить уведомление как отклоненное пользователем
   */
  dismiss(notificationId: string): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.status = 'dismissed';
      notification.dismissedAt = Date.now();
    }
  }

  /**
   * Получить историю уведомлений
   */
  getHistory(startDate?: number, endDate?: number): SignalNotification[] {
    let filtered = this.notifications;

    if (startDate) {
      filtered = filtered.filter(n => n.timestamp >= startDate);
    }

    if (endDate) {
      filtered = filtered.filter(n => n.timestamp <= endDate);
    }

    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Получить pending уведомления
   */
  getPendingNotifications(): SignalNotification[] {
    return this.notifications.filter(n => n.status === 'pending');
  }

  /**
   * Обновить preferences
   */
  updatePreferences(preferences: Partial<NotificationPreferences>): void {
    this.preferences = { ...this.preferences, ...preferences };
  }

  /**
   * Очистить старые уведомления (старше 90 дней)
   */
  cleanup(): void {
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    this.notifications = this.notifications.filter(n => n.timestamp >= ninetyDaysAgo);
  }
}
