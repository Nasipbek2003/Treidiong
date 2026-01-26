/**
 * Telegram Polling Service - автоматическая обработка команд
 */

import { TelegramBot } from './telegram-bot';

export class TelegramPollingService {
  private bot: TelegramBot;
  private isRunning: boolean = false;
  private lastUpdateId: number = 0;
  private pollInterval: NodeJS.Timeout | null = null;
  private onSymbolsUpdate?: (symbols: string[]) => void;

  constructor(
    bot: TelegramBot,
    onSymbolsUpdate?: (symbols: string[]) => void
  ) {
    this.bot = bot;
    this.onSymbolsUpdate = onSymbolsUpdate;
  }

  /**
   * Запустить polling
   */
  start(): void {
    if (this.isRunning) {
      console.log('⚠️  Polling уже запущен');
      return;
    }

    this.isRunning = true;
    console.log('🤖 Telegram Polling запущен');
    console.log('📱 Бот готов принимать команды в Telegram\n');

    // Проверяем новые сообщения каждые 2 секунды
    this.pollInterval = setInterval(() => {
      this.checkUpdates();
    }, 2000);
  }

  /**
   * Остановить polling
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    this.isRunning = false;
    console.log('🤖 Telegram Polling остановлен');
  }

  /**
   * Проверить новые сообщения
   */
  private async checkUpdates(): Promise<void> {
    try {
      const updates = await this.bot.getUpdates(this.lastUpdateId + 1);

      if (updates.length === 0) {
        return;
      }

      for (const update of updates) {
        this.lastUpdateId = update.update_id;

        // Обрабатываем только текстовые сообщения
        if (update.message && update.message.text) {
          await this.handleMessage(update.message);
        }
      }
    } catch (error) {
      console.error('Ошибка polling:', error);
    }
  }

  /**
   * Обработать сообщение
   */
  private async handleMessage(message: any): Promise<void> {
    const text = message.text;
    const chatId = message.chat.id.toString();
    const username = message.from.username || message.from.first_name;

    console.log(`📨 Получено от @${username}: ${text}`);

    // Проверяем что это команда
    if (!text.startsWith('/')) {
      return;
    }

    // Обрабатываем команду
    const response = await this.bot.processCommand(text);

    // Отправляем ответ
    await this.bot.sendMessage(response);

    console.log(`✅ Ответ отправлен\n`);

    // Уведомляем об изменении подписок
    if (this.onSymbolsUpdate) {
      const activeSymbols = this.bot.getActiveSymbolsList();
      this.onSymbolsUpdate(activeSymbols);
    }
  }

  /**
   * Проверка статуса
   */
  isActive(): boolean {
    return this.isRunning;
  }
}
