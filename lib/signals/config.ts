/**
 * Signal Notification System - Configuration
 */

import { SignalNotificationConfig, NotificationPreferences, SymbolConfig } from './types';

/**
 * Конфигурация по умолчанию
 */
export const DEFAULT_SIGNAL_CONFIG: SignalNotificationConfig = {
  monitoringInterval: 10 * 60 * 1000, // 10 минут
  warningCooldown: 30 * 60 * 1000, // 30 минут
  urgentCooldown: 15 * 60 * 1000, // 15 минут
  warningThreshold: 60,
  urgentThreshold: 80,
  maxRetries: 3,
  retryDelay: 5000, // 5 секунд
};

/**
 * Настройки уведомлений по умолчанию
 */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enableWarning: true,
  enableUrgent: true,
  minScore: 60,
  enablePush: true,
  enableInApp: true,
  activeSymbols: ['XAU/USD', 'XAG/USD', 'EUR/USD', 'GBP/USD'],
};

/**
 * Доступные символы для мониторинга
 */
export const AVAILABLE_SYMBOLS: SymbolConfig[] = [
  // Драгоценные металлы
  { symbol: 'XAU/USD', enabled: true, interval: '15min', displayName: 'Золото' },
  { symbol: 'XAG/USD', enabled: true, interval: '15min', displayName: 'Серебро' },
  
  // Форекс - мажоры
  { symbol: 'EUR/USD', enabled: true, interval: '15min', displayName: 'Евро/Доллар' },
  { symbol: 'GBP/USD', enabled: true, interval: '15min', displayName: 'Фунт/Доллар' },
  { symbol: 'USD/JPY', enabled: false, interval: '15min', displayName: 'Доллар/Йена' },
  { symbol: 'USD/CHF', enabled: false, interval: '15min', displayName: 'Доллар/Франк' },
  { symbol: 'AUD/USD', enabled: false, interval: '15min', displayName: 'Австралийский доллар' },
  { symbol: 'USD/CAD', enabled: false, interval: '15min', displayName: 'Доллар/Канадский доллар' },
  
  // Сырьевые товары
  { symbol: 'CL', enabled: false, interval: '15min', displayName: 'Нефть WTI' },
  
  // Криптовалюты (через Twelve Data)
  { symbol: 'BTC/USD', enabled: false, interval: '15min', displayName: 'Bitcoin' },
  { symbol: 'ETH/USD', enabled: false, interval: '15min', displayName: 'Ethereum' },
];
