/**
 * Инициализация Trading Signal System
 * 
 * Singleton для управления глобальными экземплярами
 */

import { LiquidityEngine } from '../liquidity/engine';
import { SignalMonitor } from './signal-monitor';
import { NotificationManager } from './notification-manager';
import { TelegramConfig } from './telegram-notifier';
import { DEFAULT_CONFIG } from '../liquidity/config';
import { DEFAULT_NOTIFICATION_PREFERENCES } from './config';
import type { LiquidityConfig } from '../liquidity/types';
import type { NotificationPreferences, SignalNotificationConfig } from './types';

class SignalSystemManager {
  private static instance: SignalSystemManager;
  private engine: LiquidityEngine | null = null;
  private notificationManager: NotificationManager | null = null;
  private monitor: SignalMonitor | null = null;
  private initialized: boolean = false;

  private constructor() {}

  /**
   * Получить singleton instance
   */
  static getInstance(): SignalSystemManager {
    if (!SignalSystemManager.instance) {
      SignalSystemManager.instance = new SignalSystemManager();
    }
    return SignalSystemManager.instance;
  }

  /**
   * Инициализировать систему
   */
  initialize(
    liquidityConfig?: Partial<LiquidityConfig>,
    notificationPreferences?: Partial<NotificationPreferences>,
    monitorConfig?: Partial<SignalNotificationConfig>,
    telegramConfig?: TelegramConfig
  ): void {
    if (this.initialized) {
      console.warn('SignalSystem уже инициализирована');
      return;
    }

    // Создаем компоненты
    this.engine = new LiquidityEngine({
      ...DEFAULT_CONFIG,
      ...liquidityConfig,
    });

    this.notificationManager = new NotificationManager({
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...notificationPreferences,
    });

    this.monitor = new SignalMonitor(
      this.engine,
      this.notificationManager,
      monitorConfig,
      telegramConfig
    );

    this.initialized = true;
    console.log('✓ SignalSystem инициализирована');
  }

  /**
   * Получить LiquidityEngine
   */
  getEngine(): LiquidityEngine {
    if (!this.engine) {
      throw new Error('SignalSystem не инициализирована. Вызовите initialize() сначала.');
    }
    return this.engine;
  }

  /**
   * Получить NotificationManager
   */
  getNotificationManager(): NotificationManager {
    if (!this.notificationManager) {
      throw new Error('SignalSystem не инициализирована. Вызовите initialize() сначала.');
    }
    return this.notificationManager;
  }

  /**
   * Получить SignalMonitor
   */
  getMonitor(): SignalMonitor {
    if (!this.monitor) {
      throw new Error('SignalSystem не инициализирована. Вызовите initialize() сначала.');
    }
    return this.monitor;
  }

  /**
   * Запустить мониторинг
   */
  startMonitoring(): void {
    const monitor = this.getMonitor();
    monitor.start();
  }

  /**
   * Остановить мониторинг
   */
  stopMonitoring(): void {
    const monitor = this.getMonitor();
    monitor.stop();
  }

  /**
   * Проверка инициализации
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Сброс системы (для тестов)
   */
  reset(): void {
    if (this.monitor) {
      this.monitor.stop();
    }
    
    this.engine = null;
    this.notificationManager = null;
    this.monitor = null;
    this.initialized = false;
    
    console.log('✓ SignalSystem сброшена');
  }
}

// Экспорт singleton
export const signalSystem = SignalSystemManager.getInstance();

/**
 * Хелпер для быстрой инициализации с дефолтными настройками
 */
export function initializeSignalSystem(): void {
  signalSystem.initialize();
}

/**
 * Хелпер для инициализации с кастомными настройками
 */
export function initializeSignalSystemWithConfig(
  liquidityConfig?: Partial<LiquidityConfig>,
  notificationPreferences?: Partial<NotificationPreferences>,
  monitorConfig?: Partial<SignalNotificationConfig>,
  telegramConfig?: TelegramConfig
): void {
  signalSystem.initialize(liquidityConfig, notificationPreferences, monitorConfig, telegramConfig);
}
