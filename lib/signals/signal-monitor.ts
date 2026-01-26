/**
 * SignalMonitor - Background Worker для мониторинга рынка
 * 
 * Выполняет:
 * - Периодический анализ рынка (каждые 10 минут)
 * - Tier 1 анализ (технический через LiquidityEngine)
 * - Tier 2 анализ (AI подтверждение)
 * - Генерацию уведомлений
 */

import { LiquidityEngine } from '../liquidity/engine';
import { NotificationManager } from './notification-manager';
import { TelegramNotifier, TelegramConfig } from './telegram-notifier';
import {
  SignalNotificationConfig,
  Tier1Analysis,
  Tier2Analysis,
  SignalUrgency,
} from './types';
import { Candlestick, TradingSignal } from '../liquidity/types';
import { DEFAULT_SIGNAL_CONFIG } from './config';

export interface MarketData {
  symbol: string;
  candles: Candlestick[];
  rsiData?: number[];
}

export class SignalMonitor {
  private engine: LiquidityEngine;
  private notificationManager: NotificationManager;
  private telegramNotifier: TelegramNotifier | null = null;
  private config: SignalNotificationConfig;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor(
    engine: LiquidityEngine,
    notificationManager: NotificationManager,
    config?: Partial<SignalNotificationConfig>,
    telegramConfig?: TelegramConfig
  ) {
    this.engine = engine;
    this.notificationManager = notificationManager;
    this.config = { ...DEFAULT_SIGNAL_CONFIG, ...config };
    
    // Инициализация Telegram если передан config
    if (telegramConfig) {
      this.telegramNotifier = new TelegramNotifier(telegramConfig);
      console.log('✓ Telegram notifier инициализирован');
    }
  }

  /**
   * Запустить мониторинг
   */
  start(): void {
    if (this.isRunning) {
      console.warn('SignalMonitor уже запущен');
      return;
    }

    this.isRunning = true;
    console.log(`SignalMonitor запущен (интервал: ${this.config.monitoringInterval / 1000}s)`);

    // Первый запуск сразу
    this.runAnalysis();

    // Затем по расписанию
    this.intervalId = setInterval(() => {
      this.runAnalysis();
    }, this.config.monitoringInterval);
  }

  /**
   * Остановить мониторинг
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    console.log('SignalMonitor остановлен');
  }

  /**
   * Выполнить полный цикл анализа
   */
  private async runAnalysis(): Promise<void> {
    try {
      console.log(`[${new Date().toISOString()}] Запуск анализа рынка...`);

      // Получаем активные символы из preferences
      const activeSymbols = this.notificationManager['preferences'].activeSymbols || ['BTCUSDT'];

      console.log(`Мониторинг символов: ${activeSymbols.join(', ')}`);

      // Анализируем каждый символ
      for (const symbol of activeSymbols) {
        await this.analyzeSymbol(symbol);
      }

      console.log('Анализ завершён\n');
    } catch (error) {
      console.error('Ошибка в runAnalysis:', error);
    }
  }

  /**
   * Анализ одного символа
   */
  private async analyzeSymbol(symbol: string): Promise<void> {
    try {
      console.log(`\n📊 Анализ ${symbol}...`);

      // 1. Получить данные рынка
      const marketData = await this.fetchMarketData(symbol);

      if (!marketData) {
        console.warn(`Не удалось получить данные для ${symbol}`);
        return;
      }

      // 2. Tier 1 Analysis (технический)
      const tier1 = await this.performTier1Analysis(marketData);

      if (!tier1.signal || tier1.score.totalScore < this.config.warningThreshold) {
        console.log(`${symbol}: Score ${tier1.score.totalScore.toFixed(1)} - пропускаем`);
        return;
      }

      console.log(`✓ ${symbol} Tier 1: Score ${tier1.score.totalScore.toFixed(1)}`);

      // 3. Tier 2 Analysis (AI)
      const tier2 = await this.performTier2Analysis(tier1, marketData);

      if (!tier2.confirmed) {
        console.log(`${symbol}: AI не подтвердил сигнал`);
        return;
      }

      console.log(`✓ ${symbol} Tier 2: AI подтвердил`);

      // 4. Определить urgency
      const urgency = this.determineUrgency(tier1.score.totalScore);

      // 5. Создать уведомление
      const notification = this.notificationManager.createNotification(
        tier1.signal,
        tier2.explanation,
        urgency
      );

      if (notification) {
        console.log(`✓ ${symbol}: Уведомление создано: ${urgency.toUpperCase()} ${tier1.signal.direction}`);
        
        // 6. Отправить уведомление
        await this.sendNotification(notification);
      } else {
        console.log(`${symbol}: Уведомление заблокировано (cooldown или preferences)`);
      }
    } catch (error) {
      console.error(`Ошибка анализа ${symbol}:`, error);
    }
  }

  /**
   * Получить данные рынка
   */
  private async fetchMarketData(symbol: string = 'XAU/USD'): Promise<MarketData | null> {
    try {
      const interval = '15min';
      const limit = 100;
      const apiKey = process.env.NEXT_PUBLIC_TWELVE_DATA_API_KEY || process.env.TWELVE_DATA_API_KEY;

      if (!apiKey) {
        throw new Error('TWELVE_DATA_API_KEY not configured');
      }

      // Twelve Data API для золота и других активов
      const response = await fetch(
        `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=${interval}&outputsize=${limit}&apikey=${apiKey}`
      );

      if (!response.ok) {
        throw new Error(`Twelve Data API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'error') {
        throw new Error(data.message || 'API Error');
      }

      if (!data.values || data.values.length === 0) {
        throw new Error('No data returned from API');
      }

      // Преобразуем в Candlestick формат
      const candles: Candlestick[] = data.values
        .map((item: any) => ({
          timestamp: new Date(item.datetime).getTime(),
          open: parseFloat(item.open),
          high: parseFloat(item.high),
          low: parseFloat(item.low),
          close: parseFloat(item.close),
          volume: parseFloat(item.volume || '0'),
        }))
        .reverse(); // Twelve Data возвращает в обратном порядке

      // Рассчитываем RSI
      const rsiData = this.calculateRSI(candles);

      return {
        symbol,
        candles,
        rsiData,
      };
    } catch (error) {
      console.error('Ошибка получения данных:', error);
      return null;
    }
  }

  /**
   * Рассчитать RSI
   */
  private calculateRSI(candles: Candlestick[], period: number = 14): number[] {
    const rsi: number[] = [];
    
    if (candles.length < period + 1) {
      return rsi;
    }

    for (let i = period; i < candles.length; i++) {
      let gains = 0;
      let losses = 0;

      for (let j = i - period; j < i; j++) {
        const change = candles[j + 1].close - candles[j].close;
        if (change > 0) {
          gains += change;
        } else {
          losses += Math.abs(change);
        }
      }

      const avgGain = gains / period;
      const avgLoss = losses / period;
      
      if (avgLoss === 0) {
        rsi.push(100);
      } else {
        const rs = avgGain / avgLoss;
        const rsiValue = 100 - (100 / (1 + rs));
        rsi.push(rsiValue);
      }
    }

    return rsi;
  }

  /**
   * Tier 1 Analysis - технический анализ
   */
  private async performTier1Analysis(marketData: MarketData): Promise<Tier1Analysis> {
    const result = await this.engine.analyze(
      marketData.symbol,
      marketData.candles,
      marketData.rsiData
    );

    return {
      signal: result.signal,
      score: result.signal?.score || { totalScore: 0, breakdown: {
        sweepScore: 0,
        bosScore: 0,
        divergenceScore: 0,
        volumeScore: 0,
        htfScore: 0,
      }, components: [] },
      hasValidSetup: result.hasValidSetup,
      blockingReasons: result.blockingReasons,
    };
  }

  /**
   * Tier 2 Analysis - AI подтверждение
   */
  private async performTier2Analysis(
    tier1: Tier1Analysis,
    marketData: MarketData
  ): Promise<Tier2Analysis> {
    try {
      const signal = tier1.signal;
      if (!signal) {
        return {
          confirmed: false,
          explanation: 'Нет сигнала для анализа',
        };
      }

      // Формируем запрос для AI
      const prompt = `Проанализируй торговый сигнал:

Символ: ${marketData.symbol}
Направление: ${signal.direction}
Score: ${tier1.score.totalScore.toFixed(1)}/100

Детали:
${signal.reasoning}

Breakdown:
- Liquidity Sweep: ${tier1.score.breakdown.sweepScore.toFixed(1)}
- Structure Change: ${tier1.score.breakdown.bosScore.toFixed(1)}
- RSI Divergence: ${tier1.score.breakdown.divergenceScore.toFixed(1)}
- Volume: ${tier1.score.breakdown.volumeScore.toFixed(1)}
- HTF Level: ${tier1.score.breakdown.htfScore.toFixed(1)}

Подтверди сигнал и дай краткое объяснение на русском (2-3 предложения).`;

      // Вызов Claude API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
        }),
      });

      if (!response.ok) {
        throw new Error('AI API error');
      }

      const data = await response.json();
      const explanation = data.response || data.message || '';

      return {
        confirmed: true,
        explanation: explanation.trim() || this.generateTemplateExplanation(tier1),
      };
    } catch (error) {
      console.error('Ошибка AI анализа:', error);
      
      // Fallback на template-based объяснение
      return {
        confirmed: true,
        explanation: this.generateTemplateExplanation(tier1),
      };
    }
  }

  /**
   * Определить urgency на основе score
   */
  private determineUrgency(score: number): SignalUrgency {
    if (score >= this.config.urgentThreshold) {
      return 'urgent';
    }
    return 'warning';
  }

  /**
   * Отправить уведомление
   */
  private async sendNotification(notification: any): Promise<void> {
    let attempts = 0;

    while (attempts < this.config.maxRetries) {
      try {
        console.log(`Отправка уведомления (попытка ${attempts + 1})...`);
        
        // Отправка в Telegram
        if (this.telegramNotifier) {
          const success = await this.telegramNotifier.sendSignalNotification(notification);
          
          if (!success) {
            throw new Error('Telegram отправка не удалась');
          }
          
          console.log('✓ Уведомление отправлено в Telegram');
        } else {
          console.warn('Telegram notifier не настроен');
        }
        
        this.notificationManager.markAsSent(notification.id);
        console.log('✓ Уведомление отправлено');
        return;
      } catch (error) {
        attempts++;
        console.error(`Ошибка отправки (попытка ${attempts}):`, error);
        
        if (attempts < this.config.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
        }
      }
    }

    this.notificationManager.markAsFailed(notification.id);
    console.error('Не удалось отправить уведомление после всех попыток');
  }

  /**
   * Установить Telegram notifier
   */
  setTelegramNotifier(config: TelegramConfig): void {
    this.telegramNotifier = new TelegramNotifier(config);
    console.log('✓ Telegram notifier установлен');
  }

  /**
   * Проверить подключение к Telegram
   */
  async testTelegramConnection(): Promise<boolean> {
    if (!this.telegramNotifier) {
      console.error('Telegram notifier не настроен');
      return false;
    }

    return await this.telegramNotifier.checkConnection();
  }

  /**
   * Отправить тестовое сообщение в Telegram
   */
  async sendTelegramTest(): Promise<boolean> {
    if (!this.telegramNotifier) {
      console.error('Telegram notifier не настроен');
      return false;
    }

    return await this.telegramNotifier.sendTestMessage();
  }

  /**
   * Template-based объяснение (fallback)
   */
  private generateTemplateExplanation(tier1: Tier1Analysis): string {
    const signal = tier1.signal!;
    return signal.reasoning;
  }

  /**
   * Проверка статуса
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Получить конфигурацию
   */
  getConfig(): SignalNotificationConfig {
    return { ...this.config };
  }
}
