/**
 * Trading Signal Notification System
 * 
 * Экспорт всех компонентов системы
 */

export * from './types';
export * from './config';
export * from './notification-manager';
export * from './signal-monitor';
export * from './telegram-notifier';
export * from './auto-start';

// Re-export для удобства
export { NotificationManager } from './notification-manager';
export { SignalMonitor } from './signal-monitor';
export { TelegramNotifier } from './telegram-notifier';
export { autoStartSignalSystem } from './auto-start';
export { DEFAULT_SIGNAL_CONFIG, DEFAULT_NOTIFICATION_PREFERENCES } from './config';
