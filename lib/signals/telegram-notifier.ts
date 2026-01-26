/**
 * TelegramNotifier - Отправка уведомлений в Telegram
 */

import { SignalNotification } from './types';

export interface TelegramConfig {
  botToken: string;
  chatId: string;
}

export class TelegramNotifier {
  private botToken: string;
  private chatId: string;
  private apiUrl: string;

  constructor(config: TelegramConfig) {
    this.botToken = config.botToken;
    this.chatId = config.chatId;
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  /**
   * Отправить уведомление о сигнале
   */
  async sendSignalNotification(notification: SignalNotification): Promise<boolean> {
    try {
      const message = this.formatSignalMessage(notification);
      await this.sendMessage(message);
      return true;
    } catch (error) {
      console.error('Ошибка отправки в Telegram:', error);
      return false;
    }
  }

  /**
   * Форматировать сообщение для Telegram
   */
  private formatSignalMessage(notification: SignalNotification): string {
    const urgencyEmoji = notification.urgency === 'urgent' ? '🚨' : '⚠️';
    const directionEmoji = notification.direction === 'BUY' ? '🟢' : '🔴';
    
    const lines: string[] = [];
    
    // Заголовок
    lines.push(`${urgencyEmoji} <b>${notification.urgency.toUpperCase()} СИГНАЛ</b>`);
    lines.push('');
    
    // Основная информация
    lines.push(`${directionEmoji} <b>${notification.direction}</b> ${notification.symbol}`);
    lines.push(`📊 Score: <b>${notification.score.toFixed(1)}/100</b>`);
    lines.push('');
    
    // Объяснение
    lines.push(`💡 ${notification.explanation}`);
    lines.push('');
    
    // Время
    const time = new Date(notification.timestamp).toLocaleString('ru-RU', {
      timeZone: 'Europe/Moscow',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    lines.push(`🕐 ${time} (МСК)`);
    
    return lines.join('\n');
  }

  /**
   * Отправить текстовое сообщение
   */
  private async sendMessage(text: string): Promise<void> {
    const url = `${this.apiUrl}/sendMessage`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: this.chatId,
        text,
        parse_mode: 'HTML',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Telegram API error: ${response.status} - ${error}`);
    }
  }

  /**
   * Отправить тестовое сообщение
   */
  async sendTestMessage(): Promise<boolean> {
    try {
      await this.sendMessage('✅ Telegram уведомления настроены успешно!');
      return true;
    } catch (error) {
      console.error('Ошибка отправки тестового сообщения:', error);
      return false;
    }
  }

  /**
   * Проверить подключение к боту
   */
  async checkConnection(): Promise<boolean> {
    try {
      const url = `${this.apiUrl}/getMe`;
      const response = await fetch(url);
      
      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      console.log('Telegram bot:', data.result.username);
      return true;
    } catch (error) {
      console.error('Ошибка проверки подключения:', error);
      return false;
    }
  }
}
