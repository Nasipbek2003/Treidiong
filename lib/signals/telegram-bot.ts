/**
 * Telegram Bot - Управление подписками через команды
 */

import { AVAILABLE_SYMBOLS } from './config';

export interface TelegramBotConfig {
  botToken: string;
  chatId: string;
}

export class TelegramBot {
  private botToken: string;
  private chatId: string;
  private apiUrl: string;
  private activeSymbols: Set<string>;

  constructor(config: TelegramBotConfig, initialSymbols: string[] = []) {
    this.botToken = config.botToken;
    this.chatId = config.chatId;
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
    this.activeSymbols = new Set(initialSymbols);
  }

  /**
   * Обработка команд от пользователя
   */
  async processCommand(command: string): Promise<string> {
    const cmd = command.toLowerCase().trim();

    if (cmd === '/start' || cmd === '/help') {
      return this.getHelpMessage();
    }

    if (cmd === '/list') {
      return this.getSymbolsList();
    }

    if (cmd === '/active') {
      return this.getActiveSymbols();
    }

    if (cmd.startsWith('/subscribe ')) {
      const symbol = cmd.replace('/subscribe ', '').toUpperCase();
      return this.subscribeSymbol(symbol);
    }

    if (cmd.startsWith('/unsubscribe ')) {
      const symbol = cmd.replace('/unsubscribe ', '').toUpperCase();
      return this.unsubscribeSymbol(symbol);
    }

    if (cmd === '/all') {
      return this.subscribeAll();
    }

    if (cmd === '/none') {
      return this.unsubscribeAll();
    }

    return 'Неизвестная команда. Используй /help для списка команд.';
  }

  /**
   * Справка по командам
   */
  private getHelpMessage(): string {
    return `
🤖 <b>Команды бота</b>

<b>Управление подписками:</b>
/list - Список всех доступных пар
/active - Твои активные подписки
/subscribe SYMBOL - Подписаться на пару
/unsubscribe SYMBOL - Отписаться от пары
/all - Подписаться на все пары
/none - Отписаться от всех пар

<b>Примеры:</b>
/subscribe BTCUSDT
/unsubscribe ETHUSDT

<b>Доступные пары:</b>
${AVAILABLE_SYMBOLS.map(s => s.symbol).join(', ')}
    `.trim();
  }

  /**
   * Список всех доступных символов
   */
  private getSymbolsList(): string {
    const lines = ['📊 <b>Доступные пары для мониторинга:</b>\n'];

    AVAILABLE_SYMBOLS.forEach((config, index) => {
      const status = this.activeSymbols.has(config.symbol) ? '✅' : '⭕';
      lines.push(`${index + 1}. ${status} <b>${config.symbol}</b> - ${config.displayName}`);
    });

    lines.push('\n💡 Используй /subscribe SYMBOL для подписки');
    lines.push('💡 Используй /unsubscribe SYMBOL для отписки');

    return lines.join('\n');
  }

  /**
   * Список активных подписок
   */
  private getActiveSymbols(): string {
    if (this.activeSymbols.size === 0) {
      return '⭕ У тебя нет активных подписок.\n\nИспользуй /list чтобы увидеть доступные пары.';
    }

    const lines = ['✅ <b>Твои активные подписки:</b>\n'];

    Array.from(this.activeSymbols).forEach((symbol, index) => {
      const config = AVAILABLE_SYMBOLS.find(s => s.symbol === symbol);
      const displayName = config?.displayName || symbol;
      lines.push(`${index + 1}. <b>${symbol}</b> - ${displayName}`);
    });

    lines.push(`\n📊 Всего: ${this.activeSymbols.size} пар`);

    return lines.join('\n');
  }

  /**
   * Подписаться на символ
   */
  private subscribeSymbol(symbol: string): string {
    const config = AVAILABLE_SYMBOLS.find(s => s.symbol === symbol);

    if (!config) {
      return `❌ Пара ${symbol} не найдена.\n\nИспользуй /list для списка доступных пар.`;
    }

    if (this.activeSymbols.has(symbol)) {
      return `⚠️ Ты уже подписан на ${symbol}`;
    }

    this.activeSymbols.add(symbol);
    return `✅ Подписка на <b>${symbol}</b> (${config.displayName}) активирована!\n\nТеперь ты будешь получать сигналы по этой паре.`;
  }

  /**
   * Отписаться от символа
   */
  private unsubscribeSymbol(symbol: string): string {
    if (!this.activeSymbols.has(symbol)) {
      return `⚠️ Ты не подписан на ${symbol}`;
    }

    this.activeSymbols.delete(symbol);
    const config = AVAILABLE_SYMBOLS.find(s => s.symbol === symbol);
    const displayName = config?.displayName || symbol;

    return `✅ Подписка на <b>${symbol}</b> (${displayName}) отключена.`;
  }

  /**
   * Подписаться на все пары
   */
  private subscribeAll(): string {
    AVAILABLE_SYMBOLS.forEach(config => {
      this.activeSymbols.add(config.symbol);
    });

    return `✅ Подписка на все пары активирована!\n\n📊 Всего: ${this.activeSymbols.size} пар\n\nИспользуй /active чтобы увидеть список.`;
  }

  /**
   * Отписаться от всех пар
   */
  private unsubscribeAll(): string {
    const count = this.activeSymbols.size;
    this.activeSymbols.clear();

    return `✅ Все подписки отключены (было: ${count} пар).\n\nИспользуй /list чтобы подписаться снова.`;
  }

  /**
   * Получить активные символы
   */
  getActiveSymbolsList(): string[] {
    return Array.from(this.activeSymbols);
  }

  /**
   * Установить активные символы
   */
  setActiveSymbols(symbols: string[]): void {
    this.activeSymbols = new Set(symbols);
  }

  /**
   * Отправить сообщение
   */
  async sendMessage(text: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.chatId,
          text,
          parse_mode: 'HTML',
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
      return false;
    }
  }

  /**
   * Получить обновления (новые сообщения)
   */
  async getUpdates(offset?: number): Promise<any[]> {
    try {
      const url = offset
        ? `${this.apiUrl}/getUpdates?offset=${offset}`
        : `${this.apiUrl}/getUpdates`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.ok) {
        return data.result;
      }

      return [];
    } catch (error) {
      console.error('Ошибка получения обновлений:', error);
      return [];
    }
  }
}
