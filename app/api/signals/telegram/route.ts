/**
 * API: Telegram Integration
 * 
 * Настройка и тестирование Telegram уведомлений
 */

import { NextRequest, NextResponse } from 'next/server';
import { signalSystem } from '@/lib/signals/init';

/**
 * POST /api/signals/telegram - Настроить Telegram
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, botToken, chatId } = body;

    if (!signalSystem.isInitialized()) {
      return NextResponse.json(
        { error: 'SignalSystem не инициализирована' },
        { status: 500 }
      );
    }

    const monitor = signalSystem.getMonitor();

    // Настройка Telegram
    if (action === 'configure') {
      if (!botToken || !chatId) {
        return NextResponse.json(
          { error: 'botToken и chatId обязательны' },
          { status: 400 }
        );
      }

      monitor.setTelegramNotifier({ botToken, chatId });

      return NextResponse.json({
        message: 'Telegram настроен успешно',
      });
    }

    // Проверка подключения
    if (action === 'test-connection') {
      const success = await monitor.testTelegramConnection();

      return NextResponse.json({
        success,
        message: success
          ? 'Подключение к Telegram успешно'
          : 'Ошибка подключения к Telegram',
      });
    }

    // Отправка тестового сообщения
    if (action === 'test-message') {
      const success = await monitor.sendTelegramTest();

      return NextResponse.json({
        success,
        message: success
          ? 'Тестовое сообщение отправлено'
          : 'Ошибка отправки тестового сообщения',
      });
    }

    return NextResponse.json(
      { error: 'Неизвестное действие' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Ошибка Telegram API:', error);
    return NextResponse.json(
      { error: 'Ошибка настройки Telegram' },
      { status: 500 }
    );
  }
}
