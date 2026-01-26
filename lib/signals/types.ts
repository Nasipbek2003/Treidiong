/**
 * Trading Signal Notification System - Type Definitions
 */

import { TradingSignal, SignalScore } from '../liquidity/types';

/**
 * Уровень срочности сигнала
 */
export type SignalUrgency = 'warning' | 'urgent';

/**
 * Статус уведомления
 */
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'dismissed';

/**
 * Тип уведомления
 */
export type NotificationType = 'push' | 'in_app';

/**
 * Уведомление о торговом сигнале
 */
export interface SignalNotification {
  /** Уникальный ID */
  id: string;
  /** ID торгового сигнала */
  signalId: string;
  /** Символ (например, BTCUSDT) */
  symbol: string;
  /** Направление сигнала */
  direction: 'BUY' | 'SELL';
  /** Уровень срочности */
  urgency: SignalUrgency;
  /** Score сигнала */
  score: number;
  /** Объяснение на русском */
  explanation: string;
  /** Тип уведомления */
  type: NotificationType;
  /** Статус */
  status: NotificationStatus;
  /** Время создания */
  timestamp: number;
  /** Время отправки */
  sentAt?: number;
  /** Время отклонения пользователем */
  dismissedAt?: number;
}

/**
 * Настройки уведомлений пользователя
 */
export interface NotificationPreferences {
  /** Включены ли warning сигналы */
  enableWarning: boolean;
  /** Включены ли urgent сигналы */
  enableUrgent: boolean;
  /** Минимальный score для уведомлений */
  minScore: number;
  /** Включены ли push уведомления */
  enablePush: boolean;
  /** Включены ли in-app уведомления */
  enableInApp: boolean;
  /** Список активных символов для мониторинга */
  activeSymbols: string[];
}

/**
 * Конфигурация символа для мониторинга
 */
export interface SymbolConfig {
  /** Символ (например, BTCUSDT) */
  symbol: string;
  /** Включен ли мониторинг */
  enabled: boolean;
  /** Интервал свечей */
  interval: string;
  /** Название для отображения */
  displayName?: string;
}

/**
 * Результат Tier 1 анализа (технический)
 */
export interface Tier1Analysis {
  /** Торговый сигнал */
  signal: TradingSignal | null;
  /** Score */
  score: SignalScore;
  /** Есть ли валидная setup */
  hasValidSetup: boolean;
  /** Причины блокировки */
  blockingReasons: string[];
}

/**
 * Результат Tier 2 анализа (AI)
 */
export interface Tier2Analysis {
  /** Подтверждение от AI */
  confirmed: boolean;
  /** Объяснение на русском */
  explanation: string;
  /** Дополнительный контекст */
  context?: string;
}

/**
 * Cooldown запись для предотвращения спама
 */
export interface NotificationCooldown {
  /** Символ */
  symbol: string;
  /** Направление */
  direction: 'BUY' | 'SELL';
  /** Время последнего уведомления */
  lastNotificationTime: number;
  /** Длительность cooldown в мс */
  cooldownDuration: number;
}

/**
 * Конфигурация системы уведомлений
 */
export interface SignalNotificationConfig {
  /** Интервал мониторинга в мс (по умолчанию 10 минут) */
  monitoringInterval: number;
  /** Cooldown для warning сигналов в мс (30 минут) */
  warningCooldown: number;
  /** Cooldown для urgent сигналов в мс (15 минут) */
  urgentCooldown: number;
  /** Минимальный score для warning (60) */
  warningThreshold: number;
  /** Минимальный score для urgent (80) */
  urgentThreshold: number;
  /** Максимум попыток отправки */
  maxRetries: number;
  /** Задержка между попытками в мс */
  retryDelay: number;
}
